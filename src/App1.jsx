import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  GoogleMap,
  Autocomplete,
  useJsApiLoader,
  OverlayView,
} from "@react-google-maps/api";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";
import { supabase } from "./supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoImg from "./assets/sharp.JPG";
import venmoQR from "./assets/venmoQR.PNG";
import "./LawnApp1.css";

const LIBRARIES = ["geometry", "places"]; // Removed "drawing" library

export default function LawnBusinessApp() {
  const [customer, setCustomer] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [totalArea, setTotalArea] = useState(0);
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

      // CRITICAL: Ensure inputs/text match current state in the clone
      // Since clones don't always carry over dynamic React text updates perfectly
      const cloneName = clone.querySelector('p[style*="font-weight: bold"]');
      if (cloneName) cloneName.innerText = customer.name || "Valued Customer";

      if (type === "customer") {
        // Hide Details and Amount columns
        const allRows = clone.querySelectorAll("tr");
        allRows.forEach((row) => {
          const cells = row.querySelectorAll("th, td");
          if (cells[1]) cells[1].style.display = "none";
          if (cells[2]) cells[2].style.display = "none";
        });

        // Hide Subtotal in total block
        const subtotalLine = clone.querySelector(
          "div[style*='background-color: #f8f9fa'] div:first-child",
        );
        if (subtotalLine) subtotalLine.style.display = "none";
      }

      // Capture and Generate PDF with Dynamic Height
      Object.assign(clone.style, {
        position: "absolute",
        top: "-9999px",
        left: "0",
        width: "800px",
        height: "auto", // Let it grow
        display: "block",
        overflow: "visible",
      });

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 800, // Lock width
        height: clone.offsetHeight, // Use offsetHeight to capture the full expanded notes
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Calculate height proportionally so it doesn't compress
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Sanitize filename
      const safeName = (customer.name || "Customer")
        .trim()
        .replace(/[^a-z0-9]/gi, "_");
      pdf.save(
        `${type === "sharp" ? "Sharp" : "Customer"}_Estimate_${safeName}.pdf`,
      );
    } catch (err) {
      console.error("PDF Error:", err);
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
        setCustomer={setCustomer}
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
        <h1 style={{ textAlign: "center" }}>
          <img
            src={logoImg}
            alt="Logo"
            style={{ height: "150px", borderRadius: "8px" }}
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

          {/* VALID FOR 30 DAYS DISCLAIMER */}
          <div
            id="pdf-disclaimer"
            style={{
              marginTop: "50px",
              paddingTop: "20px",
              borderTop: "1px solid #eee",
              textAlign: "center",
              fontSize: "14px",
              color: "#555",
              width: "100%",
              clear: "both",
              fontStyle: "italic",
            }}
          >
            <strong>
              Estimate valid for 30 days. Thank you for choosing Sharp Lawn
              Mowing!
            </strong>
          </div>
        </div>
      </div>

      {/* THE MAP IS NOW OUTSIDE THE PDF CONTAINER */}
      <LawnCalculator
        setTotalArea={setTotalArea}
        totalArea={totalArea}
        onLoadClear={(fn) => (clearMapRef.current = fn)}
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
            Sharp PDF
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
            Customer PDF
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
      // Calculate the mowing price with the $50 minimum logic
      const rawLawnCost =
        totalArea * (parseFloat(pricingData.ratePerSqFt) || 0);
      const billedLawnPrice = rawLawnCost < 50 ? 50 : rawLawnCost;

      const { error } = await supabase.from("estimates").insert([
        {
          name: customer.name,
          address: customer.address,
          phone: customer.phone,
          email: customer.email,
          lawn_area: totalArea,
          notes: customer.notes,
          rate_used: parseFloat(pricingData.ratePerSqFt) || 0,
          // We store the adjusted lawn price to keep records clear
          extra_label: pricingData.customExtra?.active
            ? pricingData.customExtra.label
            : null,
          extra_price: pricingData.customExtra?.active
            ? parseFloat(pricingData.customExtra.price)
            : 0,
          // This is the total the customer actually pays (already includes the $50 min)
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

function LawnCalculator({ setTotalArea, totalArea, onLoadClear }) {
  const [labelPosition, setLabelPosition] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [mapCenter, setMapCenter] = useState({ lat: 26.1224, lng: -80.1373 });
  const [mapInstance, setMapInstance] = useState(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  useEffect(() => {
    // 1. Wait for mapInstance AND the geometry library
    if (!mapInstance || drawRef.current || !window.google?.maps?.geometry)
      return;

    const initDraw = () => {
      try {
        // 2. CRITICAL FIX: TerraDraw Google Adapter needs a div with an ID
        const mapDiv = mapInstance.getDiv();
        if (!mapDiv.id) mapDiv.id = "terra-draw-map-canvas";

        const draw = new TerraDraw({
          adapter: new TerraDrawGoogleMapsAdapter({
            map: mapInstance,
            lib: window.google.maps,
          }),
          modes: [
            new TerraDrawPolygonMode({
              snapping: true,
              styles: {
                fillColor: "#27ae60",
                fillOpacity: 0.4,
                strokeColor: "#27ae60",
                strokeWeight: 2,
              },
            }),
            new TerraDrawSelectMode({
              flags: {
                polygon: {
                  draggable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
            }),
          ],
        });

        // 3. CRITICAL FIX: Wait for adapter ready before setting mode
        draw.on("ready", () => {
          draw.setMode("polygon");
        });

        draw.start();
        drawRef.current = draw;

        const handleDrawChange = () => {
          const snapshot = draw.getSnapshot();
          let newTotalArea = 0;
          snapshot.forEach((feature) => {
            if (feature.geometry.type === "Polygon") {
              const path = feature.geometry.coordinates[0].map((c) => ({
                lat: c[1],
                lng: c[0],
              }));
              const area =
                window.google.maps.geometry.spherical.computeArea(path);
              newTotalArea += Math.round(area * 10.7639);
              setLabelPosition({ lat: path[0].lat, lng: path[0].lng });
            }
          });
          setTotalArea(newTotalArea);
        };

        draw.on("finish", handleDrawChange);
        draw.on("change", handleDrawChange);
      } catch (err) {
        console.error("Terra Draw Init Error:", err);
      }
    };

    // 4. Wait for projection to be ready (ensures coordinates map correctly)
    const listener = mapInstance.addListener("projection_changed", () => {
      initDraw();
      window.google.maps.event.removeListener(listener);
    });

    return () => {
      if (drawRef.current) {
        drawRef.current.stop();
        drawRef.current = null;
      }
    };
  }, [mapInstance, setTotalArea]);

  const onMapLoad = (map) => {
    mapRef.current = map;
    setMapInstance(map);
    map.setOptions({
      clickableIcons: false,
      gestureHandling: "greedy",
    });
  };

  const handleClearAll = useCallback(() => {
    if (drawRef.current) drawRef.current.clear();
    setTotalArea(0);
    setLabelPosition(null);
  }, [setTotalArea]);

  useEffect(() => {
    if (onLoadClear) {
      onLoadClear(handleClearAll);
    }
  }, [onLoadClear, handleClearAll]);

  const onPlaceChanged = () => {
    if (autocomplete && mapRef.current) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        mapRef.current.panTo(place.geometry.location);
        setMapCenter(place.geometry.location);
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setZoom(21);
            setMapZoom(21);
            mapRef.current.setMapTypeId("satellite");
          }
        }, 150);
      }
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom < 21) {
        mapRef.current.setZoom(currentZoom + 1);
        setMapZoom(currentZoom + 1);
      }
    }
  };

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
            />
          </Autocomplete>
        </div>
        <button
          type="button"
          className="btn-draw"
          onClick={() => {
            if (drawRef.current) {
              drawRef.current.setMode("polygon");
              mapRef.current.setOptions({ draggableCursor: "crosshair" });
            }
          }}
        >
          Draw
        </button>
        <button
          type="button"
          className="btn-edit"
          onClick={() => drawRef.current?.setMode("select")}
        >
          Edit
        </button>
        <button type="button" className="btn-zoom" onClick={handleZoomIn}>
          +
        </button>
        <button type="button" className="btn-clear" onClick={handleClearAll}>
          Clear
        </button>
      </div>

      <div id="map-canvas-container">
        <GoogleMap
          onLoad={onMapLoad}
          zoom={mapZoom}
          center={mapCenter}
          mapTypeId="satellite"
          mapContainerStyle={{
            height: "60vh",
            width: "100%",
            borderRadius: "12px",
          }}
          options={{
            tilt: 0,
            streetViewControl: false,
            maxZoom: 21,
            mapTypeControl: true,
            clickableIcons: false,
          }}
        >
          {totalArea > 0 && labelPosition && (
            <OverlayView
              position={labelPosition}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="area-label">
                {totalArea.toLocaleString()} sq ft
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
