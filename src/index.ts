import axios from "axios";
import _ from "lodash";
import pino from "pino";
import schedule from "node-schedule";
import nodemailer from "nodemailer";
import path from "path";
import { file, write } from "bun";
import "dotenv/config";

interface IResult {
  acceptTime: string;
  acceptAddress: string | null;
  remark: string | null;
}

const logger = pino(pino.destination("./update.log"));

export async function fetchTrackingInfo() {
  try {
    const tokenResponse = await axios.post<{ accessToken: string }>(
      process.env.TOKEN_URL,
      new URLSearchParams({
        partnerID: process.env.CUSTOMER,
        secret: process.env.PRODUCT,
        grandType: "password",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.accessToken;
    const msgData = JSON.stringify({
      trackingType: 1,
      trackingNumber: ["SF-xxxxx"],
      checkPhoneNo: "1234",
    });

    const trackingResponse = await axios.post(
      process.env.URL,
      new URLSearchParams({
        accessToken,
        timestamp: (Date.now() / 1000).toFixed(), // 转为 10 位时间戳
        serviceCode: "EXP_RECE_SEARCH_ROUTES",
        msgData: msgData,
        partnerID: process.env.CUSTOMER,
        requestID: "123456", // FIXME: 生成唯一的 requestID
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const result: { routes: IResult[] }[] = JSON.parse(
      trackingResponse.data.apiResultData
    ).msgData.routeResps;

    let isUpdate = false;
    let currentData: IResult[] = [];
    const dataFilePath = path.join(__dirname, "data.json");
    try {
      currentData = await file(dataFilePath).json();
    } catch (err) {
      logger.error({ msg: "read file error", err });
    }
    for (const order of result) {
      for (const route of order.routes) {
        const acceptTime = route.acceptTime;
        if (!_.some(currentData, { acceptTime })) {
          isUpdate = true;
          logger.info({ route });
          currentData.push(
            _.pick(route, ["acceptTime", "acceptAddress", "remark"])
          );
        }
      }
    }
    if (!isUpdate) {
      logger.info("No update");
    } else {
      write(dataFilePath, JSON.stringify(currentData, null, 2));
      sendEmail(currentData);
    }
  } catch (error) {
    console.error("Error fetching tracking info:", error);
  }
}

export async function sendEmail(data: IResult[]) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_RECEIVER,
    subject: "Tracking Information Update",
    text: data
      .map(
        (item) =>
          `Time: ${item.acceptTime}, Address: ${item.acceptAddress}, Remark: ${item.remark}`
      )
      .join("\n"),
  };
  try {
    const transporter = nodemailer.createTransport({
      service: "qq",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);
    logger.info({
      msg: "send mail",
      data: mailOptions.text,
      receiver: process.env.EMAIL_RECEIVER,
    });
  } catch (err) {
    logger.error({ msg: "send mail error", err });
  }
}

// Schedule the task to run every hour
schedule.scheduleJob("0 * * * *", fetchTrackingInfo);
