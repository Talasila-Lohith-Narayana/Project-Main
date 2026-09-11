import React from "react";
import { Panel } from "../States";

export default function DashboardTopCategories({ categories = [], navigate }) {
  return (
    <Panel
      title="Top product categories"
      sub="High volume merchandise across the catalog · Click category to filter products"
    >
      <div className="catGrid">
        {categories.map((item, index) => (
          <div
            className="cat kpiCardHover"
            key={item.category}
            onClick={() => navigate(`/products?category=${encodeURIComponent(item.category)}`)}
            style={{ cursor: "pointer" }}
            title={`View products under ${item.category.replace(/_/g, " ")}`}
          >
            <b>0{index + 1}</b>
            <div style={{ flex: 1 }}>
              <strong style={{ textTransform: "capitalize" }}>
                {item.category.replace(/_/g, " ")}
              </strong>
              <span>{Number(item.purchases).toLocaleString("en-US")} items sold</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
