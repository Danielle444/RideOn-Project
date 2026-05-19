import React from "react";

import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import roleSharedStyles from "../../styles/roleSharedStyles";

function getStatusLabel(status) {
  if (status === "Approved") {
    return {
      label: "מאושר",
      color: "#4CAF50",
    };
  }

  if (status === "Pending") {
    return {
      label: "ממתין לאישור",
      color: "#F59E0B",
    };
  }

  return {
    label: "לא הועלה",
    color: "#8A7268",
  };
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return String(value);
  }
}

export default function HealthCertificateCard(props) {
  var cert = props.cert;

  var isUploading = props.uploadingHorseId === cert.horseId;

  var status = getStatusLabel(cert.hcApprovalStatus);

  return (
    <View
      style={[
        roleSharedStyles.card,
        {
          marginBottom: 12,
        },
      ]}
    >
      <View style={roleSharedStyles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={roleSharedStyles.cardTitle}>{cert.horseName}</Text>

          {cert.barnName ? (
            <Text
              style={{
                color: "#8A7268",
                fontSize: 13,
                marginTop: 2,
                textAlign: "right",
              }}
            >
              כינוי: {cert.barnName}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: status.color + "20",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              color: status.color,
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {status.label}
          </Text>
        </View>
      </View>

      {cert.hcUploadDate ? (
        <Text
          style={{
            color: "#8A7268",
            fontSize: 12,
            marginBottom: 10,
            textAlign: "right",
          }}
        >
          הועלה: {formatDate(cert.hcUploadDate)}
        </Text>
      ) : (
        <Text
          style={{
            color: "#8A7268",
            fontSize: 12,
            marginBottom: 10,
            textAlign: "right",
          }}
        >
          עדיין לא הועלתה תעודת בריאות
        </Text>
      )}

      <View style={roleSharedStyles.buttonsRow}>
        <Pressable
          style={[
            roleSharedStyles.primaryButton,
            {
              flex: 1,
              opacity: isUploading ? 0.6 : 1,
            },
          ]}
          onPress={function () {
            if (typeof props.onUpload === "function") {
              props.onUpload(cert);
            }
          }}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color="#fff"
                style={{ marginLeft: 6 }}
              />

              <Text style={roleSharedStyles.primaryButtonText}>
                {cert.hcPath ? "החלף קובץ" : "העלה PDF"}
              </Text>
            </>
          )}
        </Pressable>

        {cert.hcPath ? (
          <Pressable
            style={[
              roleSharedStyles.primaryButton,
              {
                backgroundColor: "#6B7280",
                flex: 1,
              },
            ]}
            onPress={function () {
              Linking.openURL(cert.hcPath);
            }}
          >
            <Ionicons
              name="document-outline"
              size={16}
              color="#fff"
              style={{ marginLeft: 6 }}
            />

            <Text style={roleSharedStyles.primaryButtonText}>צפה בקובץ</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
