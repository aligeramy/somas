import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    google: typeof google;
  }
}

export function useGooglePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null> | React.MutableRefObject<HTMLInputElement | null>,
  onPlaceSelect?: (address: string) => void,
) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) {
      return;
    }

    // Clean up existing autocomplete if it exists
    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        componentRestrictions: { country: ["ca", "us"] }, // Restrict to Canada and US
      }
    );

    autocompleteRef.current = autocomplete;

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address && onPlaceSelect) {
        onPlaceSelect(place.formatted_address);
      }
    });
  }, [inputRef, onPlaceSelect]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not found");
      return;
    }

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      initializeAutocomplete();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      // Wait for script to load
      existingScript.addEventListener("load", initializeAutocomplete);
      return () => {
        existingScript.removeEventListener("load", initializeAutocomplete);
      };
    }

    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initializeAutocomplete();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove autocomplete listeners
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current
        );
      }
    };
  }, [initializeAutocomplete]);
}

