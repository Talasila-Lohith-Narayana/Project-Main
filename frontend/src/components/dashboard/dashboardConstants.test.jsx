import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TIMEFRAME_OPTIONS,
  SEGMENT_COLORS,
  PAYMENT_ICONS,
  PAYMENT_COLORS,
  STATE_COLORS,
  SegmentBarTooltip,
  RevenueTooltip,
  RegionalPieTooltip,
  PaymentPieTooltip,
} from "./dashboardConstants";

describe("dashboardConstants and Tooltips", () => {
  it("exports configuration arrays and maps with correct items", () => {
    expect(TIMEFRAME_OPTIONS).toHaveLength(5);
    expect(SEGMENT_COLORS.Champions).toBe("#10b981");
    expect(PAYMENT_ICONS.credit_card).toBe("💳");
    expect(PAYMENT_COLORS.credit_card).toBe("#10b981");
    expect(STATE_COLORS.length).toBeGreaterThan(0);
  });

  describe("SegmentBarTooltip", () => {
    it("returns null when inactive or empty payload", () => {
      const { container } = render(<SegmentBarTooltip active={false} payload={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders segment name and customer count with mapped color", () => {
      const payload = [
        {
          payload: {
            segment: "Champions",
            count: 4520,
          },
        },
      ];

      render(<SegmentBarTooltip active={true} payload={payload} />);
      expect(screen.getByText("Champions")).toBeInTheDocument();
      expect(screen.getByText("4,520")).toBeInTheDocument();
    });

    it("handles fallback color for unknown segment", () => {
      const payload = [
        {
          payload: {
            segment: "UnknownSegment",
            count: 10,
          },
        },
      ];

      render(<SegmentBarTooltip active={true} payload={payload} />);
      expect(screen.getByText("UnknownSegment")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });
  });

  describe("RevenueTooltip", () => {
    it("returns null when inactive or empty payload", () => {
      const { container } = render(<RevenueTooltip active={false} payload={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders label, formatted revenue, and order volume", () => {
      const payload = [
        {
          payload: {
            revenue: 250000,
            orders: 1450,
          },
        },
      ];

      render(<RevenueTooltip active={true} payload={payload} label="2018-05" />);
      expect(screen.getByText("2018-05")).toBeInTheDocument();
      expect(screen.getByText(/250,000/)).toBeInTheDocument();
      expect(screen.getByText("1,450")).toBeInTheDocument();
    });

    it("handles zero or null revenue and orders", () => {
      const payload = [
        {
          payload: {
            revenue: null,
            orders: null,
          },
        },
      ];

      render(<RevenueTooltip active={true} payload={payload} label="2017-01" />);
      expect(screen.getByText("2017-01")).toBeInTheDocument();
      expect(screen.getByText("R$ 0")).toBeInTheDocument();
      expect(screen.getByText("Order volume:")).toBeInTheDocument();
    });
  });

  describe("RegionalPieTooltip", () => {
    it("returns null when inactive or empty payload", () => {
      const { container } = render(
        <RegionalPieTooltip active={false} payload={[]} totalRevenue={1000} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("calculates revenue percentage and displays shoppers count", () => {
      const payload = [
        {
          payload: {
            name: "São Paulo (SP)",
            revenue: 50000,
            customers: 1200,
          },
        },
      ];

      render(
        <RegionalPieTooltip active={true} payload={payload} totalRevenue={100000} />
      );
      expect(screen.getByText("São Paulo (SP)")).toBeInTheDocument();
      expect(screen.getByText(/50,000/)).toBeInTheDocument();
      expect(screen.getByText("50.0%")).toBeInTheDocument();
      expect(screen.getByText("1,200")).toBeInTheDocument();
    });

    it("handles totalRevenue = 0 gracefully", () => {
      const payload = [
        {
          payload: {
            name: "Rio de Janeiro (RJ)",
            revenue: 0,
            customers: 0,
          },
        },
      ];

      render(<RegionalPieTooltip active={true} payload={payload} totalRevenue={0} />);
      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });
  });

  describe("PaymentPieTooltip", () => {
    it("returns null when inactive or empty payload", () => {
      const { container } = render(
        <PaymentPieTooltip active={false} payload={[]} totalPaymentsValue={500} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("calculates volume share and displays payment type icon and transaction count", () => {
      const payload = [
        {
          payload: {
            type: "credit_card",
            total_value: 75000,
            count: 3200,
          },
        },
      ];

      render(
        <PaymentPieTooltip
          active={true}
          payload={payload}
          totalPaymentsValue={100000}
        />
      );
      expect(screen.getByText("credit card")).toBeInTheDocument();
      expect(screen.getByText("💳")).toBeInTheDocument();
      expect(screen.getByText(/75,000/)).toBeInTheDocument();
      expect(screen.getByText("75.0%")).toBeInTheDocument();
      expect(screen.getByText("3,200")).toBeInTheDocument();
    });

    it("handles fallback icon and zero totalPaymentsValue", () => {
      const payload = [
        {
          payload: {
            type: "unknown_custom_method",
            total_value: 0,
            count: 0,
          },
        },
      ];

      render(
        <PaymentPieTooltip
          active={true}
          payload={payload}
          totalPaymentsValue={0}
        />
      );
      expect(screen.getByText("unknown custom method")).toBeInTheDocument();
      expect(screen.getByText("0.0%")).toBeInTheDocument();
      expect(screen.getByText("💳")).toBeInTheDocument();
    });
  });
});
