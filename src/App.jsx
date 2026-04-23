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
  Polygon,
} from "@react-google-maps/api";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logoImg from "./assets/sharp.JPG";
import "./LawnApp.css";

const LIBRARIES = Object.freeze(["geometry", "places"]);

export default function LawnBusinessApp() {
  // --- STATE ---
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
  const estimateRef = useRef(null);

  const [pricingData, setPricingData] = useState({
    ratePerSqFt: 0.02,
    finalTotal: 0,
    shrubPrice: 0,
    cleanupPrice: 0,
  });

  // --- GOOGLE MAPS LOADER ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // --- PRICING LOGIC ---
  const onlyMowing =
    activeServices.mowing && !activeServices.shrubs && !activeServices.cleanup;
  const rawLawnCost = totalArea * pricingData.ratePerSqFt;
  const lawnCost = onlyMowing && rawLawnCost < 50 ? 50 : rawLawnCost;

  // --- RESET FUNCTION ---
  const resetEverything = useCallback(() => {
    if (clearMapRef.current) clearMapRef.current();
    setTotalArea(0);
    setSearchQuery("");
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

  // --- PDF GENERATION ---
  const downloadPDF = async (type = "sharp") => {
    const element = estimateRef.current;
    if (!element) return;

    try {
      const clone = element.cloneNode(true);

      // 1. Handle Visibility based on Service Selection
      // Instead of hiding checkboxes, we ensure the rows match your React state
      if (type === "customer") {
        // Hide the "Details" column (index 1) for customers
        const allRows = clone.querySelectorAll("tr");
        allRows.forEach((row) => {
          const cells = row.querySelectorAll("th, td");
          if (cells[1]) cells[1].style.display = "none";
        });

        // Hide the Internal Subtotal line
        const subtotalContainer = clone.querySelector(
          "div[style*='background-color: #f8f9fa']",
        );
        if (subtotalContainer) {
          const subtotalLine =
            subtotalContainer.querySelector("div:first-child");
          if (subtotalLine) subtotalLine.style.display = "none";
        }
      }

      // 2. Setup Clone for Rendering
      Object.assign(clone.style, {
        position: "absolute",
        top: "-9999px",
        left: "0",
        width: "800px", // Keep width fixed for consistent scaling
        height: "auto",
        display: "block",
      });

      document.body.appendChild(clone);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Slight delay for fonts/images

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      document.body.removeChild(clone);

      // 3. Multi-Page Logic (The fix for Problem #1)
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if the notes/table make the content too long
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const safeName = (customer.name || "Customer")
        .trim()
        .replace(/[^a-z0-9]/gi, "_");
      pdf.save(
        type === "sharp"
          ? `Sharp_Internal_${safeName}.pdf`
          : `Estimate_${safeName}.pdf`,
      );
    } catch (err) {
      console.error("PDF Generation Error:", err);
    }
  };

  return (
    <div className="container">
      {/* STEP 1: CUSTOMER INFO */}
      <CustomerInfoForm
        customer={customer}
        setCustomer={(newCustomer) => {
          setCustomer(newCustomer);
          if (newCustomer.address !== searchQuery)
            setSearchQuery(newCustomer.address);
        }}
      />

      {/* PDF TEMPLATE CONTAINER */}
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
            }}
          />
        </h1>

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
                    <span className="internal-only">
                      {totalArea.toLocaleString()} sq ft{" "}
                    </span>
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
                display: "block",
                marginBottom: "5px",
              }}
            >
              Next Steps
            </strong>
            <div style={{ fontWeight: "bold" }}>Call or text to schedule.</div>
            <div
              style={{
                fontStyle: "italic",
                marginTop: "5px",
                color: "#e74c3c",
              }}
            >
              Valid for 7 days.
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: MEASUREMENT */}
      <LawnCalculator
        isLoaded={isLoaded}
        setTotalArea={setTotalArea}
        totalArea={totalArea}
        onLoadClear={(fn) => (clearMapRef.current = fn)}
        externalAddress={searchQuery}
      />

      {/* STEP 2.5: SERVICE SELECTION */}
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
          {["mowing", "shrubs", "cleanup"].map((service) => (
            <label key={service}>
              <input
                type="checkbox"
                checked={activeServices[service]}
                onChange={(e) =>
                  setActiveServices({
                    ...activeServices,
                    [service]: e.target.checked,
                  })
                }
              />
              {" " + service.charAt(0).toUpperCase() + service.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* STEP 3: PRICING */}
      <EstimateCalculator
        mapTotalArea={totalArea}
        pricingData={pricingData}
        setPricingData={setPricingData}
        activeServices={activeServices}
      />

      {/* ACTION BUTTONS */}
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
          onClick={resetEverything}
          className="btn-clear"
          style={{ width: "100%", padding: "15px", marginTop: "10px" }}
        >
          Reset Everything for New Estimate
        </button>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function CustomerInfoForm({ customer, setCustomer }) {
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
      <div
        className="customer-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}
      >
        <input
          type="text"
          placeholder="Full Name"
          value={customer.name}
          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Service Address"
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
          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email Address"
          value={customer.email}
          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
          style={inputStyle}
        />
        <textarea
          placeholder="Notes..."
          value={customer.notes}
          onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
          style={{ ...inputStyle, gridColumn: "1 / -1", minHeight: "80px" }}
        />
      </div>
    </div>
  );
}

function LawnCalculator({
  isLoaded,
  setTotalArea,
  totalArea,
  externalAddress,
  onLoadClear,
}) {
  const [mapInstance, setMapInstance] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [activePath, setActivePath] = useState([]);
  const [mode, setMode] = useState("view");
  const [autocomplete, setAutocomplete] = useState(null);
  const [mapViewport, setMapViewport] = useState({
    lat: 26.1224,
    lng: -80.1373,
  });
  const [zoomLevel, setZoomLevel] = useState(15);

  const handleClearAll = useCallback(() => {
    setPolygons([]);
    setActivePath([]);
    setTotalArea(0);
    setMode("view");
  }, [setTotalArea]);

  useEffect(() => {
    if (onLoadClear) onLoadClear(handleClearAll);
  }, [onLoadClear, handleClearAll]);

  useEffect(() => {
    if (mapInstance) {
      // Force the map to refresh its view once it's ready
      mapInstance.setMapTypeId("satellite");
      mapInstance.setTilt(0);
    }
  }, [mapInstance]);

  const focusMap = useCallback(
    (location) => {
      if (!mapInstance || !location) return;
      const newPos = { lat: location.lat(), lng: location.lng() };

      // 1. Move the map immediately using the instance
      mapInstance.panTo(newPos);
      mapInstance.setMapTypeId("satellite");
      mapInstance.setTilt(0);

      // 2. Update the viewport state so the map stays centered
      setMapViewport(newPos);

      // 3. Update the zoom state with a slight delay.
      // This ensures React's 'zoom={zoomLevel}' prop doesn't
      // overwrite the map's zoom while it is still panning.
      setTimeout(() => {
        setZoomLevel(21);
        mapInstance.setZoom(21);
      }, 100);

      // 4. Robust 'Idle' listener for a final force
      const listener = mapInstance.addListener("idle", () => {
        setZoomLevel(21);
        mapInstance.setZoom(21);
        window.google.maps.event.removeListener(listener);
      });
    },
    [mapInstance],
  );

  useEffect(() => {
    if (isLoaded && mapInstance && externalAddress?.trim().length > 6) {
      const geocoder = new window.google.maps.Geocoder();
      const timeoutId = setTimeout(() => {
        geocoder.geocode({ address: externalAddress }, (results, status) => {
          if (status === "OK" && results[0])
            focusMap(results[0].geometry.location);
        });
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [externalAddress, isLoaded, mapInstance, focusMap]);

  const onPolygonEdit = useCallback((index, polygonInstance) => {
    if (!polygonInstance) return;

    // 1. Get the updated path from the actual Google Map element
    const path = polygonInstance.getPath();
    const updatedCoords = path.getArray().map((latLng) => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    // 2. Update the polygons array in state to trigger the area recalculation
    setPolygons((prev) => {
      const next = [...prev];
      next[index] = updatedCoords;
      return next;
    });
  }, []);

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

  return (
    <div style={{ borderBottom: "2px solid #eee", paddingBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <h3>Step 2: Measure Property</h3>
        <div
          style={{
            padding: "10px",
            backgroundColor: "#f0fff4",
            border: "1px solid #27ae60",
            borderRadius: "8px",
            color: "#27ae60",
            fontWeight: "bold",
          }}
        >
          Total Area: {totalArea.toLocaleString()} sq ft
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
          flexWrap: "wrap",
        }}
      >
        <Autocomplete
          onLoad={setAutocomplete}
          onPlaceChanged={() => {
            const place = autocomplete.getPlace();
            if (place.geometry) focusMap(place.geometry.location);
          }}
        >
          <input
            type="text"
            placeholder="Search Address..."
            style={{ padding: "10px", width: "250px" }}
          />
        </Autocomplete>
        <button
          className={`btn-draw ${mode === "draw" ? "active" : ""}`}
          onClick={() => setMode("draw")}
        >
          Draw Mode
        </button>
        {mode === "draw" && activePath.length > 0 && (
          <button
            onClick={() => {
              setPolygons([...polygons, activePath]);
              setActivePath([]);
            }}
            style={{ backgroundColor: "#27ae60", color: "white" }}
          >
            Finish Section
          </button>
        )}
        <button
          className={`btn-edit ${mode === "edit" ? "active" : ""}`}
          onClick={() => setMode(mode === "edit" ? "view" : "edit")}
        >
          {mode === "edit" ? "Save/Done" : "Edit"}
        </button>
        <button className="btn-clear" onClick={handleClearAll}>
          Clear Map
        </button>
      </div>
      <div
        style={{ height: "450px", borderRadius: "12px", overflow: "hidden" }}
      >
        <GoogleMap
          onLoad={setMapInstance}
          zoom={zoomLevel}
          center={mapViewport} // Use the state variable
          onZoomChanged={() => {
            if (mapInstance) {
              const newZoom = mapInstance.getZoom();
              // Only update state if the zoom is actually different and valid
              if (newZoom && newZoom !== zoomLevel) {
                setZoomLevel(newZoom);
              }
            }
          }}
          onClick={(e) => {
            if (mode === "draw") {
              const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
              setActivePath((prev) => [...prev, newPoint]);
            }
          }}
          mapContainerStyle={{ height: "100%", width: "100%" }}
          options={{
            tilt: 0,
            maxZoom: 22,
            mapTypeId: "satellite",
            // Adding these ensures UI doesn't interfere
            disableDefaultUI: false,
            gestureHandling: mode === "draw" ? "none" : "greedy",
          }}
        >
          {polygons.map((p, i) => (
            <Polygon
              key={i}
              path={p}
              editable={mode === "edit"}
              draggable={mode === "edit"}
              // CHANGE: Use 'this' to refer to the actual Polygon being dragged/edited
              onMouseUp={function () {
                onPolygonEdit(i, this);
              }}
              onDragEnd={function () {
                onPolygonEdit(i, this);
              }}
              // These listeners catch the path changes specifically
              onLoad={(polygon) => {
                const path = polygon.getPath();
                window.google.maps.event.addListener(path, "set_at", () =>
                  onPolygonEdit(i, polygon),
                );
                window.google.maps.event.addListener(path, "insert_at", () =>
                  onPolygonEdit(i, polygon),
                );
              }}
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
  const rawLawnCost = mapTotalArea * ratePerSqFt;
  const lawnCost =
    activeServices.mowing &&
    !activeServices.shrubs &&
    !activeServices.cleanup &&
    rawLawnCost < 50
      ? 50
      : rawLawnCost;

  const finalTotal =
    (activeServices.mowing ? lawnCost : 0) +
    (activeServices.shrubs ? Number(shrubPrice || 0) : 0) +
    (activeServices.cleanup ? Number(cleanupPrice || 0) : 0);

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
      <div style={{ display: "grid", gap: "10px" }}>
        <div>
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
          <div>
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
          <div>
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
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#27ae60",
          marginTop: "10px",
        }}
      >
        Total: ${finalTotal.toFixed(2)}
      </div>
    </div>
  );
}
