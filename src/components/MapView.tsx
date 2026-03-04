"use client";

import { useEffect, useCallback, useMemo, memo, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Venue } from "@/lib/types";

const MARKER_COLORS = [
  "#e40303", // red
  "#ff8c00", // orange
  "#ffed00", // yellow
  "#008026", // green
  "#004dff", // blue
  "#750787", // purple
  "#ffffff", // white
  "#ffafc8", // pink
  "#74d7ee", // trans blue
  "#ffda00", // intersex
  "#613915", // PoC brown
];

const ATL_CENTER = { lat: 33.77, lng: -84.39 };

interface MapViewProps {
  venues: Venue[];
  filteredVenues: Venue[];
  selectedVenue: Venue | null;
  selectedNeighborhood: string | null;
  onMarkerClick: (id: number) => void;
  onMapClick: () => void;
}

function MarkerPin({
  color,
  isSelected,
}: {
  color: string;
  isSelected: boolean;
}) {
  const size = isSelected ? 36 : 28;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        filter: isSelected
          ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          : "drop-shadow(0 1px 2px rgba(0,0,0,0.2))",
        transition: "all 0.2s",
      }}
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={color}
        stroke="#333"
        strokeWidth="0.5"
      />
      <circle cx="12" cy="9" r="3" fill="white" opacity="0.8" />
    </svg>
  );
}

function InfoWindowContent({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const [faviconError, setFaviconError] = useState(false);

  let faviconUrl: string | null = null;
  if (venue.restaurant_url) {
    try {
      const hostname = new URL(venue.restaurant_url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
    } catch {
      // invalid URL
    }
  }

  const firstLetter = venue.restaurant_name?.charAt(0)?.toUpperCase() || "?";

  return (
    <InfoWindow
      position={{ lat: venue.latitude!, lng: venue.longitude! }}
      onCloseClick={onClose}
      pixelOffset={[0, -35]}
    >
      <div className="info-window-rainbow min-w-[220px] max-w-[280px]">
        <div className="rainbow-bar" />
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center shrink-0">
              {faviconUrl && !faviconError ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={faviconUrl}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded-sm"
                  loading="lazy"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <span className="text-[10px] font-bold text-brand-purple/70 leading-none">
                  {firstLetter}
                </span>
              )}
            </div>
            <h3 className="font-bold text-brand-purple text-[14px] leading-tight">
              {venue.restaurant_name}
            </h3>
          </div>
          <p className="text-[13px] text-gray-600 mt-1 leading-snug line-clamp-2">
            {venue.deal}
          </p>
          <div className="flex gap-3 mt-1.5">
            {venue.restaurant_url && (
              <a
                href={venue.restaurant_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-brand-purple font-medium hover:underline"
              >
                Site
              </a>
            )}
            {venue.maps_url && (
              <a
                href={venue.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-brand-purple font-medium hover:underline"
              >
                Go
              </a>
            )}
          </div>
        </div>
        <div className="rainbow-bar" />
      </div>
    </InfoWindow>
  );
}

const MapContent = memo(function MapContent({
  venues,
  filteredVenues,
  selectedVenue,
  selectedNeighborhood,
  onMarkerClick,
  onMapClick,
}: MapViewProps) {
  const map = useMap();

  // Compute which venue IDs are visible
  const filteredIds = useMemo(
    () => new Set(filteredVenues.map((v) => v.id)),
    [filteredVenues]
  );

  // Zoom to neighborhood when selected WITHOUT a venue — venue panTo takes priority.
  // selectedVenue is intentionally excluded from deps: deselecting a venue should NOT
  // re-trigger fitBounds (acceptance: "deselect venue → map stays at current zoom").
  useEffect(() => {
    if (!map || !selectedNeighborhood || selectedVenue) return;

    const neighborhoodVenues = venues.filter(
      (v) =>
        v.neighborhood === selectedNeighborhood &&
        v.latitude != null &&
        v.longitude != null
    );
    if (neighborhoodVenues.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const v of neighborhoodVenues) {
      bounds.extend({ lat: v.latitude!, lng: v.longitude! });
    }
    map.fitBounds(bounds, { top: 80, bottom: 20, left: 20, right: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedNeighborhood, venues]);

  // Center on selected venue
  useEffect(() => {
    if (!map || !selectedVenue?.latitude || !selectedVenue?.longitude) return;
    map.panTo({ lat: selectedVenue.latitude, lng: selectedVenue.longitude });
  }, [map, selectedVenue]);

  const mappableVenues = venues.filter(
    (v) => v.latitude != null && v.longitude != null
  );

  return (
    <>
      {mappableVenues.map((venue) => {
        const isSelected = selectedVenue?.id === venue.id;
        const isFiltered = filteredIds.has(venue.id);
        const isInNeighborhood =
          !selectedNeighborhood ||
          venue.neighborhood === selectedNeighborhood;

        const opacity =
          selectedVenue != null
            ? isSelected
              ? 1
              : 0.2
            : selectedNeighborhood != null
              ? isInNeighborhood
                ? 1
                : 0.2
              : isFiltered
                ? 1
                : 0.3;

        const color = MARKER_COLORS[venue.id % MARKER_COLORS.length];

        return (
          <AdvancedMarker
            key={venue.id}
            position={{ lat: venue.latitude!, lng: venue.longitude! }}
            onClick={() => onMarkerClick(venue.id)}
            zIndex={isSelected ? 1000 : 1}
            style={{ opacity, transition: "opacity 0.3s" }}
          >
            <MarkerPin color={color} isSelected={isSelected} />
          </AdvancedMarker>
        );
      })}

      {selectedVenue && selectedVenue.latitude && selectedVenue.longitude && (
        <InfoWindowContent venue={selectedVenue} onClose={onMapClick} />
      )}
    </>
  );
});

export default function MapView(props: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleMapClick = useCallback(() => {
    props.onMapClick();
  }, [props.onMapClick]);

  if (!apiKey) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <div className="text-2xl mb-2">🗺️</div>
          <p className="text-gray-500 text-sm">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={ATL_CENTER}
          defaultZoom={12}
          mapId="happyhour-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          onClick={handleMapClick}
          className="w-full h-full"
        >
          <MapContent {...props} />
        </Map>
      </APIProvider>
    </div>
  );
}
