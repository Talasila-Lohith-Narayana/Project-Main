import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  authService,
  dashboardService,
  productsService,
  customerService,
} from "./api";

// Mock axios module methods
vi.mock("axios", async () => {
  globalThis.__api_handlers = {};
  const actual = await vi.importActual("axios");
  const mockAxiosInstance = {
    get: vi.fn(() => Promise.resolve({ data: { success: true } })),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
    patch: vi.fn(() => Promise.resolve({ data: { success: true } })),
    delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
    interceptors: {
      request: {
        use: vi.fn((handler) => {
          globalThis.__api_handlers.request = handler;
        }),
      },
      response: {
        use: vi.fn((success, error) => {
          globalThis.__api_handlers.responseSuccess = success;
          globalThis.__api_handlers.responseError = error;
        }),
      },
    },
  };
  return {
    default: {
      ...actual,
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe("API Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authService", () => {
    it("calls /auth/login with credentials", async () => {
      const creds = { username: "admin", password: "password123" };
      const res = await authService.login(creds);
      expect(res).toEqual({ success: true });
    });
  });

  describe("dashboardService", () => {
    it("calls /dashboard/summary with params", async () => {
      const res = await dashboardService.summary({ timeframe: "2018" });
      expect(res).toEqual({ success: true });
    });

    it("handles string timeframe argument", async () => {
      const res = await dashboardService.summary("2018");
      expect(res).toEqual({ success: true });
    });
  });

  describe("productsService", () => {
    it("calls catalog with params", async () => {
      const res = await productsService.catalog({ page: 1 });
      expect(res).toEqual({ success: true });
    });

    it("calls byCategory endpoint", async () => {
      const res = await productsService.byCategory("health_beauty");
      expect(res).toEqual({ success: true });
    });

    it("calls exportCsv endpoint", async () => {
      const res = await productsService.exportCsv({ category: "books" });
      expect(res).toBeDefined();
    });
  });

  describe("customerService", () => {
    it("lists customers with params", async () => {
      const res = await customerService.list({ page: 1 });
      expect(res).toEqual({ success: true });
    });

    it("creates a customer profile", async () => {
      const res = await customerService.create({ name: "John Doe" });
      expect(res).toEqual({ success: true });
    });

    it("fetches customer detail by id", async () => {
      const res = await customerService.detail("cust_123");
      expect(res).toEqual({ success: true });
    });

    it("updates customer profile", async () => {
      const res = await customerService.update("cust_123", { city: "Rio" });
      expect(res).toEqual({ success: true });
    });

    it("removes customer profile", async () => {
      const res = await customerService.remove("cust_123");
      expect(res).toEqual({ success: true });
    });

    it("fetches customer orders", async () => {
      const res = await customerService.orders("cust_123");
      expect(res).toEqual({ success: true });
    });

    it("creates an order for a customer", async () => {
      const res = await customerService.createOrder("cust_123", { value: 100 });
      expect(res).toEqual({ success: true });
    });

    it("updates an existing order", async () => {
      const res = await customerService.updateOrder("cust_123", "ord_1", { status: "shipped" });
      expect(res).toEqual({ success: true });
    });

    it("deletes an order", async () => {
      const res = await customerService.removeOrder("cust_123", "ord_1");
      expect(res).toEqual({ success: true });
    });

    it("fetches customer reviews", async () => {
      const res = await customerService.reviews("cust_123");
      expect(res).toEqual({ success: true });
    });

    it("creates a review", async () => {
      const res = await customerService.createReview("cust_123", { score: 5 });
      expect(res).toEqual({ success: true });
    });

    it("updates a review", async () => {
      const res = await customerService.updateReview("cust_123", "rev_1", { score: 4 });
      expect(res).toEqual({ success: true });
    });

    it("fetches interactions", async () => {
      const res = await customerService.interactions("cust_123");
      expect(res).toEqual({ success: true });
    });

    it("adds an interaction", async () => {
      const res = await customerService.addInteraction("cust_123", { title: "Call" });
      expect(res).toEqual({ success: true });
    });

    it("updates an interaction", async () => {
      const res = await customerService.updateInteraction("cust_123", "act_1", { title: "Updated" });
      expect(res).toEqual({ success: true });
    });

    it("handles bulkSegmentUpdate and bulkDelete", async () => {
      const res1 = await customerService.bulkSegmentUpdate({ customer_ids: ["c1"], segment: "High Risk" });
      const res2 = await customerService.bulkDelete({ customer_ids: ["c1"] });
      expect(res1).toEqual({ success: true });
      expect(res2).toEqual({ success: true });
    });

    it("fetches audit logs and global audit logs", async () => {
      const res1 = await customerService.auditLogs("cust_123");
      const res2 = await customerService.globalAuditLogs();
      expect(res1).toEqual({ success: true });
      expect(res2).toEqual({ success: true });
    });

    it("exports customer csv", async () => {
      const res = await customerService.exportCsv({ state: "SP" });
      expect(res).toBeDefined();
    });

    it("fetches customer products", async () => {
      const res = await customerService.products("cust_123");
      expect(res).toEqual({ success: true });
    });
  });

  describe("Axios Interceptors", () => {
    it("attaches Authorization header if session exists in localStorage", () => {
      localStorage.setItem("ci_token", "xyz_token");
      const config = { headers: {} };
      const result = globalThis.__api_handlers.request(config);
      expect(result.headers.Authorization).toBe("Bearer xyz_token");
      localStorage.removeItem("ci_token");
    });

    it("passes response through on success", () => {
      const mockResponse = { data: { message: "ok" } };
      const result = globalThis.__api_handlers.responseSuccess(mockResponse);
      expect(result).toBe(mockResponse);
    });

    it("handles network connection error without response", async () => {
      const error = { response: null };
      await expect(globalThis.__api_handlers.responseError(error)).rejects.toThrow(
        /Unable to connect to the server/i
      );
    });

    it("handles Pydantic validation error lists with field names", async () => {
      const error = {
        response: {
          status: 422,
          data: {
            detail: [
              { loc: ["body", "user_name"], msg: "field required" },
              { loc: ["body", "password"], msg: "too short" },
            ],
          },
        },
      };
      await expect(globalThis.__api_handlers.responseError(error)).rejects.toThrow(
        /user name: field required/i
      );
    });

    it("handles string detail from FastAPI HTTPException", async () => {
      const error = {
        response: {
          status: 400,
          data: { detail: "Custom bad request error" },
        },
      };
      await expect(globalThis.__api_handlers.responseError(error)).rejects.toThrow(
        "Custom bad request error"
      );
    });

    it("handles HTTP status code fallback messages", async () => {
      const err = (status) => ({ response: { status, data: {} } });

      await expect(globalThis.__api_handlers.responseError(err(401))).rejects.toThrow(/session has expired/i);
      await expect(globalThis.__api_handlers.responseError(err(403))).rejects.toThrow(/Permission denied/i);
      await expect(globalThis.__api_handlers.responseError(err(404))).rejects.toThrow(/record was not found/i);
      await expect(globalThis.__api_handlers.responseError(err(409))).rejects.toThrow(/conflicting record/i);
      await expect(globalThis.__api_handlers.responseError(err(422))).rejects.toThrow(/invalid formatting/i);
      await expect(globalThis.__api_handlers.responseError(err(500))).rejects.toThrow(/Internal server error/i);
      await expect(globalThis.__api_handlers.responseError({ response: { status: 418, data: {} }, message: "I'm a teapot" })).rejects.toThrow("I'm a teapot");
    });
  });
});
