import { useRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const GOOGLE_MAPS_API_KEY = "AIzaSyByNNLup3glZOadIFmwdaAuSPOFmSLq-iY";
const DEFAULT_LAT = 31.7683;
const DEFAULT_LNG = 35.2137;

function buildMapHtml(latitude, longitude, readOnly) {
  var lat = latitude ? Number(latitude) : DEFAULT_LAT;
  var lng = longitude ? Number(longitude) : DEFAULT_LNG;
  var hasMarker = !!(latitude && longitude);
  var zoom = hasMarker ? 13 : 8;

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: #F3ECE8; }
    #search-box {
      position: absolute;
      top: 10px;
      right: 10px;
      left: 10px;
      z-index: 10;
    }
    #search-input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 12px;
      border: 2px solid #D7CCC8;
      font-size: 14px;
      direction: rtl;
      text-align: right;
      background: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    #map { width: 100%; height: 100vh; }
    #coords {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: rgba(255,255,255,0.9);
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      color: #5D4037;
      direction: ltr;
    }
  </style>
</head>
<body>
  ${!readOnly ? '<div id="search-box"><input id="search-input" type="text" placeholder="חפש כתובת..." /></div>' : ""}
  <div id="map"></div>
  <div id="coords" style="display:none"></div>

  <script>
    var map, marker, autocomplete;
    var markerExists = ${hasMarker};

    function initMap() {
      map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: ${lat}, lng: ${lng} },
        zoom: ${zoom},
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false
      });

      ${hasMarker ? `
      marker = new google.maps.Marker({
        position: { lat: ${lat}, lng: ${lng} },
        map: map,
        draggable: ${!readOnly}
      });
      showCoords(${lat}, ${lng});
      ` : ""}

      ${!readOnly ? `
      var input = document.getElementById("search-input");
      autocomplete = new google.maps.places.Autocomplete(input);
      autocomplete.bindTo("bounds", map);

      autocomplete.addListener("place_changed", function() {
        var place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;
        var lat = place.geometry.location.lat();
        var lng = place.geometry.location.lng();
        placeMarker({ lat: lat, lng: lng });
        map.setCenter({ lat: lat, lng: lng });
        map.setZoom(13);
        sendLocation(lat, lng);
      });

      map.addListener("click", function(e) {
        var lat = e.latLng.lat();
        var lng = e.latLng.lng();
        placeMarker({ lat: lat, lng: lng });
        sendLocation(lat, lng);
      });
      ` : ""}

      ${!readOnly ? `
      if (marker) {
        marker.addListener("dragend", function(e) {
          var lat = e.latLng.lat();
          var lng = e.latLng.lng();
          showCoords(lat, lng);
          sendLocation(lat, lng);
        });
      }
      ` : ""}
    }

    function placeMarker(pos) {
      if (marker) {
        marker.setPosition(pos);
      } else {
        marker = new google.maps.Marker({
          position: pos,
          map: map,
          draggable: true
        });
        marker.addListener("dragend", function(e) {
          var lat = e.latLng.lat();
          var lng = e.latLng.lng();
          showCoords(lat, lng);
          sendLocation(lat, lng);
        });
      }
      showCoords(pos.lat, pos.lng);
    }

    function showCoords(lat, lng) {
      var el = document.getElementById("coords");
      el.style.display = "block";
      el.textContent = lat.toFixed(6) + ", " + lng.toFixed(6);
    }

    function sendLocation(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap" async defer></script>
</body>
</html>`;
}

export default function RanchLocationPickerMobile({ latitude, longitude, onChange, readOnly }) {
  var webViewRef = useRef(null);

  var html = buildMapHtml(latitude, longitude, readOnly);

  var onMessage = useCallback(function (event) {
    if (readOnly) return;
    try {
      var data = JSON.parse(event.nativeEvent.data);
      if (data.latitude !== undefined && data.longitude !== undefined) {
        onChange({ latitude: data.latitude, longitude: data.longitude });
      }
    } catch (_) {}
  }, [readOnly, onChange]);

  return (
    <View style={styles.container}>
      {!readOnly && (
        <Text style={styles.hint}>לחץ על המפה או חפש כתובת לקביעת מיקום</Text>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: html }}
        style={styles.map}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={function () {
          return (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>טוען מפה...</Text>
            </View>
          );
        }}
      />
      {latitude && longitude ? (
        <Text style={styles.coords}>
          {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
        </Text>
      ) : null}
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D7CCC8",
    backgroundColor: "#F3ECE8",
  },
  map: {
    height: 280,
    width: "100%",
  },
  loading: {
    height: 280,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3ECE8",
  },
  loadingText: {
    color: "#8D6E63",
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: "#7B5A4D",
    textAlign: "right",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFF8F5",
  },
  coords: {
    fontSize: 12,
    color: "#8D6E63",
    textAlign: "right",
    paddingHorizontal: 12,
    paddingVertical: 6,
    direction: "ltr",
  },
});
