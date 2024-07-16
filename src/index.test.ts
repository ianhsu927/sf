import axios from "axios";
import {
  describe,
  beforeEach,
  afterEach,
  it,
  mock,
  expect,
  jest,
  spyOn,
} from "bun:test";
import MockAdapter from "axios-mock-adapter";
import { fetchTrackingInfo, sendEmail } from "./index";

describe("sendEmail", () => {
  it.todo("should send email with correct content", async () => {
    // Mock environment variables
    process.env.EMAIL_USER = "mockEmailUser";
    process.env.EMAIL_RECEIVER = "mockEmailReceiver";
    process.env.EMAIL_PASSWORD = "mockEmailPassword";

    // Mock data
    const data = [
      {
        acceptTime: "2022-01-01 10:00:00",
        acceptAddress: "Mock Address",
        remark: "Mock Remark",
      },
    ];

    // Mock nodemailer
    const mockSendMail = jest.fn();
    mock.module("nodemailer", () => ({
      createTransport: jest.fn().mockReturnValue({
        sendMail: mockSendMail,
      }),
    }));

    // Call the function
    await sendEmail(data);

    // Assertions
    expect(mockSendMail).toHaveBeenCalledWith({
      from: "mockEmailUser",
      to: "mockEmailReceiver",
      subject: "Tracking Information Update",
      text: "Time: 2022-01-01 10:00:00, Address: Mock Address, Remark: Mock Remark",
    });
    // Reset environment variables
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_RECEIVER;
    delete process.env.EMAIL_PASSWORD;
  });
});

describe("fetchTrackingInfo", () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.reset();
  });

  it("should fetch tracking info and update data", async () => {
    // Mock environment variables
    process.env.TOKEN_URL = "mockTokenUrl";
    process.env.URL = "mockUrl";
    process.env.CUSTOMER = "mockCustomer";
    process.env.PRODUCT = "mockProduct";

    // Mock token response
    const tokenResponse = { accessToken: "mockAccessToken" };
    mockAxios.onPost("mockTokenUrl").reply(200, tokenResponse);

    // Mock tracking response
    const trackingResponse = {
      apiResultData: JSON.stringify({
        msgData: {
          routeResps: [
            {
              routes: [
                {
                  acceptTime: "2022-01-01 10:00:00",
                  acceptAddress: "Mock Address",
                  remark: "Mock Remark",
                },
              ],
            },
          ],
        },
      }),
    };
    mockAxios.onPost("mockUrl").reply(200, trackingResponse);

    // Mock file read and write
    const mockFile = jest.fn().mockReturnValue({
      json: jest.fn().mockResolvedValue([]),
    });
    const mockWrite = jest.fn();
    mock.module("bun", () => ({
      file: mockFile,
      write: mockWrite,
    }));

    // Mock sendEmail
    const mockSendEmail = jest.fn();
    mock.module("./index", () => ({
      sendEmail: mockSendEmail,
    }));
    // Call the function
    await fetchTrackingInfo();

    // Assertions
    expect(mockAxios.history.post.length).toBe(2);

    // expect(mockFile).toHaveBeenCalledWith(expect.stringContaining("data.json"));
    expect(mockWrite).toHaveBeenCalledWith(
      expect.stringContaining("data.json"),
      JSON.stringify(
        [
          {
            acceptTime: "2022-01-01 10:00:00",
            acceptAddress: "Mock Address",
            remark: "Mock Remark",
          },
        ],
        null,
        2
      )
    );
    expect(mockSendEmail).toHaveBeenCalledWith([
      {
        acceptTime: "2022-01-01 10:00:00",
        acceptAddress: "Mock Address",
        remark: "Mock Remark",
      },
    ]);

    // Reset environment variables
  });
});
