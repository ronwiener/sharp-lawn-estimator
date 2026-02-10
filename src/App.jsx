import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  GoogleMap,
  Autocomplete,
  useJsApiLoader,
  OverlayView,
  Polygon,
} from "@react-google-maps/api";

import { supabase } from "./supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoImg from "./assets/sharp.JPG";
import venmoQR from "./assets/venmoQR.PNG";
import "./LawnApp.css";

const LIBRARIES = Object.freeze(["geometry", "places"]);

export default function LawnBusinessApp() {
  const [customer, setCustomer] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });

  const [activeServices, setActiveServices] = useState({
    mowing: true,
    shrubs: false,
    cleanup: false,
  });

  const [totalArea, setTotalArea] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const clearMapRef = useRef(null);
  const formRef = useRef(null);
  const estimateRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [pricingData, setPricingData] = useState({
    ratePerSqFt: 0.02,
    finalTotal: 0,
    shrubPrice: 0,
    cleanupPrice: 0,
  });

  // --- CENTRALIZED PRICING LOGIC ---
  // This ensures the variables are available to the PDF table and the Calculator
  const onlyMowing =
    activeServices.mowing && !activeServices.shrubs && !activeServices.cleanup;
  const rawLawnCost = totalArea * pricingData.ratePerSqFt;
  const lawnCost = onlyMowing && rawLawnCost < 50 ? 50 : rawLawnCost;

  const resetEverything = useCallback(() => {
    if (clearMapRef.current) clearMapRef.current();
    setTotalArea(0);
    setCustomer({ name: "", address: "", phone: "", email: "", notes: "" });
    setActiveServices({ mowing: true, shrubs: false, cleanup: false });
    setPricingData({
      ratePerSqFt: 0.02,
      finalTotal: 0,
      shrubPrice: 0,
      cleanupPrice: 0,
    });
  }, []);

  if (loadError)
    return (
      <div style={{ padding: "20px", color: "red" }}>Error loading Maps.</div>
    );
  if (!isLoaded)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        Loading Estimator Pro...
      </div>
    );

  const downloadPDF = async (type = "sharp") => {
    const element = estimateRef.current;
    if (!element) return;

    try {
      const clone = element.cloneNode(true);
      const checkboxes = clone.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => (cb.style.display = "none"));

      if (type === "customer") {
        const allRows = clone.querySelectorAll("tr");
        allRows.forEach((row) => {
          const cells = row.querySelectorAll("th, td");
          if (cells[1])
            cells[1].style.setProperty("display", "none", "important");
        });

        const subtotalContainer = clone.querySelector(
          "div[style*='background-color: #f8f9fa']",
        );
        if (subtotalContainer) {
          const subtotalLine =
            subtotalContainer.querySelector("div:first-child");
          if (subtotalLine) subtotalLine.style.display = "none";
        }
      }

      Object.assign(clone.style, {
        position: "absolute",
        top: "-9999px",
        left: "0",
        width: "800px",
        height: "auto",
        display: "block",
      });

      document.body.appendChild(clone);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      const safeName = (customer.name || "Customer")
        .trim()
        .replace(/[^a-z0-9]/gi, "_");
      const fileName =
        type === "sharp"
          ? `Sharp_Internal_${safeName}.pdf`
          : `Estimate_${safeName}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Generation Error:", err);
    }
  };

  return (
    <div className="container">
      <CompleteEstimateApp
        totalArea={totalArea}
        pricingData={pricingData}
        formRef={formRef}
        resetApp={resetEverything}
        customer={customer}
        activeServices={activeServices}
        setCustomer={(newCustomer) => {
          setCustomer(newCustomer);
          if (newCustomer.address !== searchQuery)
            setSearchQuery(newCustomer.address);
        }}
      />

      <div
        ref={estimateRef}
        id="estimate-container"
        style={{
          backgroundColor: "#ffffff",
          padding: "30px",
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ textAlign: "center", margin: 0 }}>
          <img
            src={logoImg}
            alt="Logo"
            style={{
              height: "150px",
              borderRadius: "12px",
              border: "6px solid #27ae60",
              padding: "25px",
              mixBlendMode: "multiply",
              filter: "contrast(1.1) brightness(1.1)",
            }}
          />
        </h1>
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#f8faff",
            borderRadius: "8px",
            border: "1px solid #d1d9e6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: "bold", color: "#3d95ce" }}>
              Venmo Payment Info:
            </div>
            <div>
              User: <strong>@Breck-Wiener</strong>
            </div>
          </div>
          <img
            src={venmoQR}
            alt="Venmo QR"
            style={{ height: "80px", width: "80px" }}
          />
        </div>
        <div
          style={{
            marginTop: "30px",
            borderTop: "2px solid #27ae60",
            paddingTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
            }}
          >
            <div>
              <h4
                style={{
                  color: "#7f8c8d",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  margin: "0 0 5px 0",
                }}
              >
                Bill To:
              </h4>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
                {customer.name || "Valued Customer"}
              </p>
              <p style={{ margin: 0, color: "#555" }}>
                {customer.address || "Service Address"}
              </p>
              {customer.email && (
                <p
                  style={{
                    margin: "2px 0 0 0",
                    color: "#555",
                    fontSize: "14px",
                  }}
                >
                  {customer.email}
                </p>
              )}
              {customer.phone && (
                <p
                  style={{
                    margin: "2px 0 0 0",
                    color: "#555",
                    fontSize: "14px",
                  }}
                >
                  {customer.phone}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <h4
                style={{
                  color: "#7f8c8d",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  margin: "0 0 5px 0",
                }}
              >
                Estimate Details:
              </h4>
              <p style={{ margin: 0 }}>
                Date: <strong>{new Date().toLocaleDateString()}</strong>
              </p>
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "30px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f8f9fa",
                  borderBottom: "2px solid #eee",
                }}
              >
                <th style={{ textAlign: "left", padding: "12px" }}>
                  Description
                </th>
                <th style={{ textAlign: "right", padding: "12px" }}>Details</th>
                <th style={{ textAlign: "right", padding: "12px" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {activeServices.mowing && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <strong>Lawn Mowing & Maintenance</strong>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px" }}>
                    {onlyMowing && rawLawnCost < 50
                      ? "Min. Charge"
                      : "Standard Rate"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    ${lawnCost.toFixed(2)}
                  </td>
                </tr>
              )}
              {activeServices.shrubs && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <strong>Shrub Trimming</strong>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px" }}>
                    Flat Fee
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    ${parseFloat(pricingData.shrubPrice || 0).toFixed(2)}
                  </td>
                </tr>
              )}
              {activeServices.cleanup && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <strong>Lawn Clean-up</strong>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px" }}>
                    Flat Fee
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    ${parseFloat(pricingData.cleanupPrice || 0).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "250px",
                backgroundColor: "#f8f9fa",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span>Subtotal:</span>
                <span>${pricingData.finalTotal.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#27ae60",
                  borderTop: "1px solid #ddd",
                  paddingTop: "10px",
                }}
              >
                <span>Total:</span>
                <span>${pricingData.finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {customer.notes && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#fffdf0",
                borderLeft: "5px solid #27ae60",
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "12px",
                  color: "#27ae60",
                  fontWeight: "bold",
                }}
              >
                NOTES:
              </h4>
              <div style={{ fontSize: "14px", whiteSpace: "pre-wrap" }}>
                {customer.notes}
              </div>
            </div>
          )}
        </div>

        <div
          id="pdf-footer"
          style={{
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "2px solid #27ae60",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "#2c3e50",
          }}
        >
          <div style={{ flex: 1 }}>
            <strong
              style={{
                color: "#27ae60",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Contact Us
            </strong>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
              📞 (954) 787-8150
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "center" }}>
            <strong
              style={{
                color: "#27ae60",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Service Location
            </strong>
            <div>{customer.address || "Property Address"}</div>
          </div>

          <div style={{ flex: 1, textAlign: "right" }}>
            <strong
              style={{
                color: "#27ae60",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Next Steps
            </strong>
            <div style={{ fontWeight: "bold" }}>
              Call or text to schedule your service.
            </div>
            <div
              style={{
                fontStyle: "italic",
                marginTop: "5px",
                color: "#e74c3c",
              }}
            >
              This estimate is valid for 7 days.
            </div>
          </div>
        </div>
      </div>

      <LawnCalculator
        isLoaded={isLoaded}
        setTotalArea={setTotalArea}
        totalArea={totalArea}
        onLoadClear={(fn) => (clearMapRef.current = fn)}
        externalAddress={searchQuery}
      />

      {/* UI Controls for Checkboxes */}
      <div
        style={{
          padding: "20px",
          background: "#fff",
          borderRadius: "8px",
          marginTop: "20px",
          border: "1px solid #eee",
        }}
      >
        <h3>Step 2.5: Select Services</h3>
        <div style={{ display: "flex", gap: "20px" }}>
          <label>
            <input
              type="checkbox"
              checked={activeServices.mowing}
              onChange={(e) =>
                setActiveServices({
                  ...activeServices,
                  mowing: e.target.checked,
                })
              }
            />{" "}
            Mowing
          </label>
          <label>
            <input
              type="checkbox"
              checked={activeServices.shrubs}
              onChange={(e) =>
                setActiveServices({
                  ...activeServices,
                  shrubs: e.target.checked,
                })
              }
            />{" "}
            Shrubs
          </label>
          <label>
            <input
              type="checkbox"
              checked={activeServices.cleanup}
              onChange={(e) =>
                setActiveServices({
                  ...activeServices,
                  cleanup: e.target.checked,
                })
              }
            />{" "}
            Clean-up
          </label>
        </div>
      </div>

      <EstimateCalculator
        mapTotalArea={totalArea}
        pricingData={pricingData}
        setPricingData={setPricingData}
        activeServices={activeServices}
      />

      <div className="action-buttons-container">
        <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
          <button
            onClick={() => downloadPDF("sharp")}
            style={{
              flex: 1,
              backgroundColor: "#ee5253",
              color: "white",
              padding: "18px",
              borderRadius: "8px",
              fontWeight: "bold",
              border: "none",
            }}
          >
            Download Sharp PDF
          </button>
          <button
            onClick={() => downloadPDF("customer")}
            style={{
              flex: 1,
              backgroundColor: "#3498db",
              color: "white",
              padding: "18px",
              borderRadius: "8px",
              fontWeight: "bold",
              border: "none",
            }}
          >
            Download Customer PDF
          </button>
        </div>
        <button
          onClick={() => formRef.current?.requestSubmit()}
          className="btn-save"
        >
          Save & Store Estimate: ${pricingData.finalTotal.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

function CompleteEstimateApp({
  totalArea,
  pricingData,
  resetApp,
  formRef,
  customer,
  setCustomer,
  activeServices,
}) {
  const handleSave = async (e) => {
    e.preventDefault();
    if (totalArea === 0 && activeServices.mowing)
      return alert("Please measure an area first.");

    try {
      const { error } = await supabase.from("estimates").insert([
        {
          name: customer.name,
          address: customer.address,
          phone: customer.phone,
          email: customer.email,
          lawn_area: totalArea,
          notes: customer.notes,
          rate_used: parseFloat(pricingData.ratePerSqFt) || 0,
          shrub_price: activeServices.shrubs
            ? parseFloat(pricingData.shrubPrice)
            : 0,
          cleanup_price: activeServices.cleanup
            ? parseFloat(pricingData.cleanupPrice)
            : 0,
          final_price: pricingData.finalTotal,
        },
      ]);
      if (error) throw error;
      alert("Success! Estimate stored.");
      resetApp();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  };

  const inputStyle = {
    padding: "12px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  };

  return (
    <div
      style={{
        padding: "25px",
        border: "1px solid #eee",
        borderRadius: "12px",
        backgroundColor: "#fff",
        marginBottom: "20px",
      }}
    >
      <h3>Step 1: Customer Information</h3>
      <form
        ref={formRef}
        onSubmit={handleSave}
        style={{ display: "flex", flexDirection: "column", gap: "15px" }}
      >
        <div className="customer-grid" style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Full Name"
            required
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Service Address"
            required
            value={customer.address}
            onChange={(e) =>
              setCustomer({ ...customer, address: e.target.value })
            }
            style={inputStyle}
          />
          <input
            type="tel"
            placeholder="Phone Number"
            value={customer.phone}
            onChange={(e) =>
              setCustomer({ ...customer, phone: e.target.value })
            }
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email Address"
            value={customer.email}
            onChange={(e) =>
              setCustomer({ ...customer, email: e.target.value })
            }
            style={inputStyle}
          />
          <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
            <textarea
              placeholder="Notes..."
              value={customer.notes}
              onChange={(e) =>
                setCustomer({ ...customer, notes: e.target.value })
              }
              style={{ ...inputStyle, width: "100%", minHeight: "80px" }}
            />
          </div>
        </div>
      </form>
    </div>
  );
}

function LawnCalculator({
  isLoaded,
  setTotalArea,
  onLoadClear,
  externalAddress,
}) {
  const [mapCenter, setMapCenter] = useState({ lat: 26.1224, lng: -80.1373 });
  const [mapInstance, setMapInstance] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [activePath, setActivePath] = useState([]);
  const [mode, setMode] = useState("view");
  const [autocomplete, setAutocomplete] = useState(null);

  // --- MISSING FUNCTION ADDED HERE ---
  const finishShape = () => {
    if (activePath.length < 3) {
      alert("Please click at least 3 points to create an area.");
      return;
    }
    setPolygons((prev) => [...prev, activePath]);
    setActivePath([]); // Reset path for the next section
  };

  const handleClearAll = useCallback(() => {
    setPolygons([]);
    setActivePath([]);
    setTotalArea(0);
    setMode("view");
  }, [setTotalArea]);

  const calculatedArea = useMemo(() => {
    if (!window.google?.maps?.geometry) return 0;
    const allPaths =
      activePath.length > 0 ? [...polygons, activePath] : polygons;
    return allPaths.reduce((acc, path) => {
      if (path.length < 3) return acc;
      const area = window.google.maps.geometry.spherical.computeArea(
        path.map((p) => new window.google.maps.LatLng(p.lat, p.lng)),
      );
      return acc + Math.round(area * 10.7639);
    }, 0);
  }, [polygons, activePath]);

  useEffect(() => {
    setTotalArea(calculatedArea);
  }, [calculatedArea, setTotalArea]);

  if (!isLoaded) return null;

  return (
    <div style={{ borderBottom: "2px solid #eee", paddingBottom: "20px" }}>
      <h3>Step 2: Measure Property</h3>

      <div className="measure-bar">
        <Autocomplete
          onLoad={setAutocomplete}
          onPlaceChanged={() => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
              mapInstance.setCenter(place.geometry.location);
              mapInstance.setMapTypeId("satellite");
              mapInstance.setZoom(21);
            }
          }}
        >
          <input
            type="text"
            placeholder="Search Address..."
            className="search-input"
          />
        </Autocomplete>

        <button
          type="button"
          className={`btn-draw ${mode === "draw" ? "active" : ""}`}
          onClick={() => setMode("draw")}
        >
          Draw
        </button>

        {mode === "draw" && activePath.length > 0 && (
          <button type="button" className="btn-finish" onClick={finishShape}>
            Finish Section
          </button>
        )}

        <button
          type="button"
          className={`btn-edit ${mode === "edit" ? "active" : ""}`}
          onClick={() => setMode("edit")}
        >
          Edit
        </button>

        <button type="button" className="btn-clear" onClick={handleClearAll}>
          Clear Map
        </button>
      </div>

      <div
        className="map-container"
        style={{ height: "450px", borderRadius: "12px", overflow: "hidden" }}
      >
        <GoogleMap
          onLoad={setMapInstance}
          zoom={15}
          center={mapCenter}
          onClick={(e) =>
            mode === "draw" &&
            setActivePath([
              ...activePath,
              { lat: e.latLng.lat(), lng: e.latLng.lng() },
            ])
          }
          mapContainerStyle={{ height: "100%", width: "100%" }}
          options={{ tilt: 0, mapTypeId: "satellite" }}
        >
          {polygons.map((p, i) => (
            <Polygon
              key={i}
              path={p}
              options={{
                fillColor: "#27ae60",
                fillOpacity: 0.4,
                strokeColor: "#27ae60",
                strokeWeight: 2,
              }}
            />
          ))}
          {activePath.length > 0 && (
            <Polygon
              path={activePath}
              options={{
                fillColor: "#f1c40f",
                fillOpacity: 0.3,
                strokeColor: "#f1c40f",
                strokeWeight: 2,
              }}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

function EstimateCalculator({
  mapTotalArea,
  pricingData,
  setPricingData,
  activeServices,
}) {
  const { ratePerSqFt, shrubPrice, cleanupPrice } = pricingData;
  const onlyMowing =
    activeServices.mowing && !activeServices.shrubs && !activeServices.cleanup;
  const rawLawnCost = mapTotalArea * ratePerSqFt;
  const lawnCost = onlyMowing && rawLawnCost < 50 ? 50 : rawLawnCost;

  const finalTotal =
    (activeServices.mowing ? lawnCost : 0) +
    (activeServices.shrubs ? parseFloat(shrubPrice || 0) : 0) +
    (activeServices.cleanup ? parseFloat(cleanupPrice || 0) : 0);

  useEffect(() => {
    setPricingData((prev) => ({ ...prev, finalTotal }));
  }, [finalTotal, setPricingData]);

  return (
    <div
      style={{
        padding: "25px",
        border: "1px solid #eee",
        borderRadius: "12px",
        background: "#fff",
        marginTop: "20px",
      }}
    >
      <h3>Step 3: Pricing & Extras</h3>
      <div style={{ marginBottom: "10px" }}>
        <label>Rate/sqft: </label>
        <input
          type="number"
          step="0.01"
          value={ratePerSqFt}
          onChange={(e) =>
            setPricingData({ ...pricingData, ratePerSqFt: e.target.value })
          }
        />
      </div>
      {activeServices.shrubs && (
        <div style={{ marginBottom: "10px" }}>
          <label>Shrub Fee: </label>
          <input
            type="number"
            value={shrubPrice}
            onChange={(e) =>
              setPricingData({ ...pricingData, shrubPrice: e.target.value })
            }
          />
        </div>
      )}
      {activeServices.cleanup && (
        <div style={{ marginBottom: "10px" }}>
          <label>Cleanup Fee: </label>
          <input
            type="number"
            value={cleanupPrice}
            onChange={(e) =>
              setPricingData({ ...pricingData, cleanupPrice: e.target.value })
            }
          />
        </div>
      )}
      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#27ae60" }}>
        Total: ${finalTotal.toFixed(2)}
      </div>
    </div>
  );
}
