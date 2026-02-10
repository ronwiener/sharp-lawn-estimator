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
    customExtra: { active: false, label: "", price: 0 },
  });

  const resetEverything = useCallback(() => {
    if (clearMapRef.current) clearMapRef.current();
    setTotalArea(0);
    // Add this line to clear customer data
    setCustomer({ name: "", address: "", phone: "", email: "", notes: "" });
    setPricingData({
      ratePerSqFt: 0.02,
      finalTotal: 0,
      customExtra: { active: false, label: "", price: 0 },
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

      // --- CUSTOMER-ONLY HIDING LOGIC ---
      if (type === "customer") {
        // 1. Hide the itemized middle column (Details) and right column (Rate calculation)
        // This targets the <th> and <td> elements in the table
        const allRows = clone.querySelectorAll("tr");
        allRows.forEach((row) => {
          const cells = row.querySelectorAll("th, td");
          // Hide the "Details" column (index 1) which shows the sq ft calculation
          if (cells[1])
            cells[1].style.setProperty("display", "none", "important");
        });

        // 2. Hide the subtotal breakdown in the bottom block if it shows sq ft math
        // This targets the specific subtotal line inside your total block
        const subtotalContainer = clone.querySelector(
          "div[style*='background-color: #f8f9fa']",
        );
        if (subtotalContainer) {
          const subtotalLine =
            subtotalContainer.querySelector("div:first-child");
          if (subtotalLine) subtotalLine.style.display = "none";
        }
      }

      // Standard Render Settings
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
        scale: 2, // Higher scale for better PDF quality
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
      {/* EVERYTHING INSIDE THIS DIV GOES TO THE PDF */}
      <CompleteEstimateApp
        totalArea={totalArea}
        pricingData={pricingData}
        formRef={formRef}
        resetApp={resetEverything}
        customer={customer}
        setCustomer={(newCustomer) => {
          setCustomer(newCustomer);
          if (newCustomer.address !== searchQuery) {
            setSearchQuery(newCustomer.address);
          }
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
          display: "block",
          height: "auto",
          overflow: "visible",
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
              backgroundColor: "transparent",
              display: "inline-block",
              objectFit: "contain",
              // React-safe camelCase naming:
              mixBlendMode: "multiply",
              // This filter forces light greys to become white so 'multiply' works better
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
            <div
              style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}
            >
              Include service address in notes.
            </div>
          </div>
          <img
            src={venmoQR}
            alt="Venmo QR"
            style={{
              height: "80px",
              width: "80px",
              borderRadius: "4px",
              border: "1px solid #eee",
              backgroundColor: "#fff",
            }}
          />
        </div>

        {/* Professional Header / Bill To Section */}

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
                  margin: "0 0 5px 0",
                  fontSize: "12px",
                  textTransform: "uppercase",
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
              {/* Display Email if it exists */}
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

              {/* Display Phone if it exists */}
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
                  margin: "0 0 5px 0",
                  fontSize: "12px",
                  textTransform: "uppercase",
                }}
              >
                Estimate Details:
              </h4>
              <p style={{ margin: 0 }}>
                Date: <strong>{new Date().toLocaleDateString()}</strong>
              </p>
              <p style={{ margin: 0 }}>
                ID:{" "}
                <strong>#EST-{Math.floor(1000 + Math.random() * 9000)}</strong>
              </p>
            </div>
          </div>

          {/* PROFESSIONAL TABLE FORM */}
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
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    color: "#2c3e50",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    color: "#2c3e50",
                  }}
                >
                  Details
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    color: "#2c3e50",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>
                  <strong>Lawn Mowing & Maintenance</strong>
                  <div style={{ fontSize: "12px", color: "#7f8c8d" }}>
                    Standard service based on area measurement
                  </div>
                </td>

                {/* --- UPDATED MIDDLE CELL --- */}
                <td style={{ textAlign: "right", padding: "12px" }}>
                  {totalArea * pricingData.ratePerSqFt < 50
                    ? "Minimum Charge"
                    : `${totalArea.toLocaleString()} sq ft @ $${pricingData.ratePerSqFt}/sq ft`}
                </td>

                {/* --- UPDATED RIGHT CELL --- */}
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px",
                    fontWeight: "bold",
                  }}
                >
                  $
                  {(totalArea * pricingData.ratePerSqFt < 50
                    ? 50
                    : totalArea * pricingData.ratePerSqFt
                  ).toFixed(2)}
                </td>
              </tr>

              {pricingData.customExtra?.active && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px" }}>
                    <strong>
                      {pricingData.customExtra.label || "Additional Fee"}
                    </strong>
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
                    ${parseFloat(pricingData.customExtra.price || 0).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* TOTAL BLOCK */}
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
                borderRadius: "4px",
                width: "100%",
                display: "block",
                clear: "both",
                pageBreakInside: "avoid",
                boxSizing: "border-box",
              }}
            >
              <h4
                style={{
                  margin: "0 0 8px 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: "12px",
                  color: "#27ae60",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  minHeight: "1em",
                }}
              >
                NOTES:
              </h4>
              <div
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#333",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: "1.4",
                }}
              >
                {customer.notes}
              </div>
            </div>
          )}

          {/* PROFESSIONAL CONTACT FOOTER */}
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
              <div>📞 (954) 787-8150</div>{" "}
              {/* Replace with your actual phone */}
              <div>📧 sharplawnmowing@gmail.com</div>
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
              <div>Reply to this email or call to schedule.</div>
              <div style={{ fontStyle: "italic", marginTop: "5px" }}>
                Valid for 7 days.
              </div>
            </div>
          </div>

          {/* FINAL THANK YOU LINE */}
          <div
            style={{
              textAlign: "center",
              marginTop: "20px",
              fontSize: "12px",
              color: "#bdc3c7",
            }}
          >
            Thank you for the opportunity to earn your business!
          </div>
        </div>
      </div>

      {/* THE MAP IS NOW OUTSIDE THE PDF CONTAINER */}
      <LawnCalculator
        isLoaded={isLoaded}
        setTotalArea={setTotalArea}
        totalArea={totalArea}
        onLoadClear={(fn) => (clearMapRef.current = fn)}
        externalAddress={searchQuery}
      />

      <EstimateCalculator
        mapTotalArea={totalArea}
        pricingData={pricingData}
        setPricingData={setPricingData}
      />
      <div className="action-buttons-container">
        {/* Side-by-Side PDF Buttons */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "10px" }}>
          <button
            onClick={() => downloadPDF("sharp")}
            style={{
              flex: 1,
              backgroundColor: "#ee5253", // Red
              color: "white",
              padding: "18px",
              borderRadius: "8px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            Download Sharp PDF
          </button>
          <button
            onClick={() => downloadPDF("customer")}
            style={{
              flex: 1,
              backgroundColor: "#3498db", // Blue
              color: "white",
              padding: "18px",
              borderRadius: "8px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
            }}
          >
            Download Customer PDF
          </button>
        </div>

        {/* Full Width Save Button */}
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
}) {
  const handleSave = async (e) => {
    e.preventDefault();
    if (totalArea === 0) return alert("Please measure an area first.");

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
          extra_label: pricingData.customExtra?.active
            ? pricingData.customExtra.label
            : null,
          extra_price: pricingData.customExtra?.active
            ? parseFloat(pricingData.customExtra.price)
            : 0,
          // Using the finalized total from our state
          final_price: pricingData.finalTotal,
        },
      ]);

      if (error) throw error;
      alert("Success! Estimate stored.");

      setCustomer({ name: "", address: "", phone: "", email: "", notes: "" });
      if (resetApp) resetApp();
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
          <div
            style={{ gridColumn: "1 / -1", marginTop: "10px", width: "100%" }}
          >
            <div style={{ position: "relative", marginTop: "10px" }}>
              {/* Permanent Marker */}
              <span
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "12px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#7f8c8d",
                  pointerEvents: "none", // Ensures clicks go through to the textarea
                  textTransform: "uppercase",
                }}
              >
                <strong>Notes:</strong>
              </span>

              <textarea
                placeholder="Gate codes, pets, specific requests..."
                value={customer.notes}
                onChange={(e) => {
                  setCustomer({ ...customer, notes: e.target.value });
                  // Automatically adjust height as you type
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                style={{
                  ...inputStyle,
                  width: "100%",
                  paddingTop: "32px",
                  minHeight: "100px",
                  height: "auto",
                  overflow: "hidden",
                  display: "block",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
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
  const [mapZoom, setMapZoom] = useState(15);
  const [mapType, setMapType] = useState("roadmap");
  const [polygons, setPolygons] = useState([]);
  const [activePath, setActivePath] = useState([]);
  const [mode, setMode] = useState("view");
  const [mapInstance, setMapInstance] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);

  // Used for the "Edit" mode of completed polygons
  const polygonRefs = useRef([]);

  useEffect(() => {
    // Only trigger if we have a map and the address is likely complete
    if (
      isLoaded &&
      mapInstance &&
      externalAddress &&
      externalAddress.length > 10
    ) {
      const delayDebounceFn = setTimeout(() => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: externalAddress }, (results, status) => {
          if (status === "OK" && results[0]) {
            const newPos = results[0].geometry.location;

            // Hard move the map
            mapInstance.setCenter(newPos);
            mapInstance.setMapTypeId("satellite");

            setMapCenter({ lat: newPos.lat(), lng: newPos.lng() });
            setMapType("satellite");

            // Force zoom 21
            setTimeout(() => {
              mapInstance.setZoom(21);
              setMapZoom(21);
            }, 250);
          }
        });
      }, 1500); // 1.5s delay so it doesn't jump while you type

      return () => clearTimeout(delayDebounceFn);
    }
  }, [externalAddress, isLoaded, mapInstance]);

  // Calculate total area on every render based on current polygons
  const calculatedData = useMemo(() => {
    if (!window.google?.maps?.geometry) return { total: 0, position: null };

    const allPaths =
      activePath.length > 0 ? [...polygons, activePath] : polygons;
    let totalSqFt = 0;
    let firstPoint = null;

    allPaths.forEach((path) => {
      if (path.length >= 3) {
        const googlePath = path.map(
          (p) => new window.google.maps.LatLng(p.lat, p.lng),
        );
        const area =
          window.google.maps.geometry.spherical.computeArea(googlePath);
        totalSqFt += Math.round(area * 10.7639);

        // Capture the very first point of the first valid polygon for the label
        if (!firstPoint && path.length > 0) firstPoint = path[0];
      }
    });

    return { total: totalSqFt, position: firstPoint };
  }, [polygons, activePath]);

  // 3. Sync the total back to the parent ONLY when it actually changes
  useEffect(() => {
    setTotalArea(calculatedData.total);
  }, [calculatedData.total, setTotalArea]);

  // --- 2. EDITING LOGIC ---
  const onEdit = useCallback((index) => {
    const polyRef = polygonRefs.current[index];
    if (polyRef) {
      const nextPath = polyRef
        .getPath()
        .getArray()
        .map((latLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        }));

      setPolygons((prev) => {
        const updated = [...prev];
        updated[index] = nextPath;
        return updated;
      });
    }
  }, []);

  // --- 3. DRAWING LOGIC ---
  const onMapClick = useCallback(
    (e) => {
      if (mode !== "draw") return;
      const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setActivePath((prev) => [...prev, newPoint]);
    },
    [mode],
  );

  const finishShape = () => {
    if (activePath.length < 3) {
      alert("Please click at least 3 points to create an area.");
      return;
    }
    setPolygons((prev) => [...prev, activePath]);
    setActivePath([]); // Reset active path so you can start a new one elsewhere
  };

  const handleClearAll = useCallback(() => {
    setPolygons([]);
    setActivePath([]);
    setTotalArea(0);
    setMode("view");
  }, [setTotalArea]);

  // Connect parent "Reset" button
  useEffect(() => {
    if (onLoadClear) onLoadClear(handleClearAll);
  }, [onLoadClear, handleClearAll]);

  // --- 4. SEARCH & ZOOM ---
  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place && place.geometry?.location) {
        const newPos = place.geometry.location;

        if (mapInstance) {
          // Use setCenter instead of panTo for a "hard" move
          mapInstance.setCenter(newPos);
          mapInstance.setMapTypeId("satellite");

          // Use a slightly longer timeout to ensure the map has finished
          // centering before applying the heavy zoom level 21
          setTimeout(() => {
            mapInstance.setZoom(21);
            setMapZoom(21);
          }, 200);
        }

        setMapCenter({ lat: newPos.lat(), lng: newPos.lng() });
        setMapType("satellite");
      }
    }
  };

  if (!isLoaded) return null;

  return (
    <div style={{ borderBottom: "2px solid #eee", paddingBottom: "20px" }}>
      <h3>Step 2: Measure Property</h3>

      <div className="measure-bar">
        <div className="search-wrapper">
          <Autocomplete
            onLoad={setAutocomplete}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              placeholder="Search Address..."
              className="search-input"
              value={externalAddress || ""}
              onChange={(e) => {
                /* Autocomplete handles internal typing */
              }}
            />
          </Autocomplete>
        </div>

        <button
          type="button"
          className={`btn-draw ${mode === "draw" ? "active" : ""}`}
          onClick={() => setMode("draw")}
        >
          Draw
        </button>

        {/* NEW: Finish Shape Button */}
        {mode === "draw" && activePath.length > 0 && (
          <button
            type="button"
            onClick={finishShape}
            style={{
              backgroundColor: "#8e44ad",
              color: "white",
              padding: "10px 15px",
              borderRadius: "6px",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              marginLeft: "10px",
            }}
          >
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
          Clear
        </button>
      </div>

      <div className="map-container">
        <GoogleMap
          onLoad={setMapInstance}
          zoom={mapZoom}
          mapTypeId={mapType}
          center={mapCenter}
          onClick={onMapClick}
          mapContainerStyle={{
            height: "100%",
            width: "100%",
            borderRadius: "12px",
          }}
          options={{
            tilt: 0,
            maxZoom: 22,
            gestureHandling: "greedy",
            streetViewControl: false,
            mapTypeControl: true,
            draggableCursor: mode === "draw" ? "crosshair" : "grab",
          }}
        >
          {/* 1. Render Completed Polygons */}
          {polygons.map((polyPath, index) => (
            <Polygon
              key={index}
              path={polyPath}
              onLoad={(poly) => (polygonRefs.current[index] = poly)}
              onEdit={() => onEdit(index)}
              onDragEnd={() => onEdit(index)}
              onMouseUp={() => onEdit(index)}
              editable={mode === "edit"}
              draggable={mode === "edit"}
              options={{
                fillColor: "#27ae60",
                fillOpacity: 0.4,
                strokeColor: "#27ae60",
                strokeWeight: 2,
              }}
            />
          ))}

          {/* 2. Render the Active (un-finished) Path */}
          {activePath.length > 0 && (
            <Polygon
              path={activePath}
              options={{
                fillColor: "#f1c40f", // Yellow so user knows it's not "done"
                fillOpacity: 0.3,
                strokeColor: "#f1c40f",
                strokeWeight: 2,
              }}
            />
          )}

          {/* 3. The Big Square Foot Label */}
          {calculatedData.total > 0 && calculatedData.position && (
            <OverlayView
              position={calculatedData.position}
              mapPaneName={OverlayView.FLOAT_PANE}
            >
              <div className="area-label">
                {calculatedData.total.toLocaleString()} sq ft
              </div>
            </OverlayView>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

function EstimateCalculator({ mapTotalArea, pricingData, setPricingData }) {
  const { customExtra, ratePerSqFt } = pricingData;
  const rawLawnCost = mapTotalArea * ratePerSqFt;
  const lawnCost = rawLawnCost < 50 ? 50 : rawLawnCost;
  const extraCost = customExtra.active ? parseFloat(customExtra.price || 0) : 0;
  const finalTotal = lawnCost + extraCost;

  useEffect(() => {
    setPricingData((prev) => ({ ...prev, finalTotal }));
  }, [finalTotal, setPricingData]);

  const inputStyle = {
    padding: "12px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  };

  return (
    <div
      id="pricing-area"
      style={{
        padding: "25px",
        border: "1px solid #eee",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        marginTop: "20px",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Step 3: Pricing Scenarios</h3>
      <p style={{ fontSize: "18px" }}>
        Total Measured Area:{" "}
        <strong>{mapTotalArea.toLocaleString()} sq ft</strong>
      </p>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Rate per sq ft ($):
        </label>
        <input
          type="number"
          step="0.01"
          value={ratePerSqFt}
          onChange={(e) =>
            setPricingData({ ...pricingData, ratePerSqFt: e.target.value })
          }
          style={{ ...inputStyle, width: "100%", maxWidth: "200px" }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          <input
            type="checkbox"
            checked={customExtra.active}
            onChange={(e) =>
              setPricingData({
                ...pricingData,
                customExtra: { ...customExtra, active: e.target.checked },
              })
            }
          />
          Add Custom Fee
        </label>
        {customExtra.active && (
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Description"
              value={customExtra.label}
              onChange={(e) =>
                setPricingData({
                  ...pricingData,
                  customExtra: { ...customExtra, label: e.target.value },
                })
              }
              style={{ ...inputStyle, flex: 3 }}
            />
            <input
              type="number"
              placeholder="0"
              value={customExtra.price || ""}
              onChange={(e) =>
                setPricingData({
                  ...pricingData,
                  customExtra: { ...customExtra, price: e.target.value },
                })
              }
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          borderTop: "2px solid #eee",
          paddingTop: "15px",
          marginTop: "15px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "20px" }}>Current Estimate:</span>
        <span
          style={{ fontSize: "28px", color: "#27ae60", fontWeight: "bold" }}
        >
          ${finalTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
