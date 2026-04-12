import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleMap, LoadScript, Marker, Autocomplete } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES = ["places"];

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "300px",
  borderRadius: "12px",
};

const DEFAULT_CENTER = { lat: 31.7683, lng: 35.2137 }; // ישראל

export default function RanchLocationPicker({ latitude, longitude, onChange }) {
  const [mapCenter, setMapCenter] = useState(
    latitude && longitude
      ? { lat: Number(latitude), lng: Number(longitude) }
      : DEFAULT_CENTER
  );
  const [markerPos, setMarkerPos] = useState(
    latitude && longitude
      ? { lat: Number(latitude), lng: Number(longitude) }
      : null
  );
  const [searchValue, setSearchValue] = useState("");
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(
    function () {
      if (latitude && longitude) {
        const pos = { lat: Number(latitude), lng: Number(longitude) };
        setMarkerPos(pos);
        setMapCenter(pos);
      }
    },
    [latitude, longitude]
  );

  const onMapLoad = useCallback(function (map) {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback(function (autocomplete) {
    autocompleteRef.current = autocomplete;
  }, []);

  function onPlaceChanged() {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const pos = { lat, lng };

    setMarkerPos(pos);
    setMapCenter(pos);
    setSearchValue(place.formatted_address || "");
    onChange({ latitude: lat, longitude: lng });
  }

  function onMapClick(event) {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const pos = { lat, lng };

    setMarkerPos(pos);
    onChange({ latitude: lat, longitude: lng });
  }

  function onMarkerDragEnd(event) {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    setMarkerPos({ lat, lng });
    onChange({ latitude: lat, longitude: lng });
  }

  function handleLatChange(e) {
    const val = e.target.value;
    const num = parseFloat(val);
    const newLat = isNaN(num) ? null : num;
    const newLng = longitude ? Number(longitude) : null;

    if (newLat !== null && newLng !== null) {
      const pos = { lat: newLat, lng: newLng };
      setMarkerPos(pos);
      setMapCenter(pos);
    }

    onChange({ latitude: newLat, longitude: newLng });
  }

  function handleLngChange(e) {
    const val = e.target.value;
    const num = parseFloat(val);
    const newLng = isNaN(num) ? null : num;
    const newLat = latitude ? Number(latitude) : null;

    if (newLat !== null && newLng !== null) {
      const pos = { lat: newLat, lng: newLng };
      setMarkerPos(pos);
      setMapCenter(pos);
    }

    onChange({ latitude: newLat, longitude: newLng });
  }

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={GOOGLE_MAPS_LIBRARIES}
        loadingElement={
          <div className="h-[300px] rounded-xl bg-[#F3ECE8] flex items-center justify-center text-sm text-[#8D6E63]">
            טוען מפה...
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              value={searchValue}
              onChange={function (e) {
                setSearchValue(e.target.value);
              }}
              placeholder="חפש כתובת או שם מקום..."
              dir="rtl"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-[#D7CCC8] bg-white text-right text-sm text-[#212121] placeholder-[#BCAAA4] focus:outline-none focus:border-[#795548] focus:ring-2 focus:ring-[#795548]/15 transition-all"
            />
          </Autocomplete>

          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={markerPos ? 13 : 8}
            onClick={onMapClick}
            onLoad={onMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {markerPos && (
              <Marker
                position={markerPos}
                draggable={true}
                onDragEnd={onMarkerDragEnd}
              />
            )}
          </GoogleMap>
        </div>
      </LoadScript>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#7B5A4D]">
            קו רוחב (Latitude)
          </label>
          <input
            type="number"
            step="any"
            value={latitude ?? ""}
            onChange={handleLatChange}
            placeholder="31.7683"
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-[#D7CCC8] bg-white text-left text-sm text-[#212121] focus:outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548]/20"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-[#7B5A4D]">
            קו אורך (Longitude)
          </label>
          <input
            type="number"
            step="any"
            value={longitude ?? ""}
            onChange={handleLngChange}
            placeholder="35.2137"
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-[#D7CCC8] bg-white text-left text-sm text-[#212121] focus:outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548]/20"
          />
        </div>
      </div>

      {markerPos && (
        <p className="text-xs text-[#8D6E63] text-right">
          מיקום נבחר: {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
