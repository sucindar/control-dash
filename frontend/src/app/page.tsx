'use client';

import React from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { useRouter } from 'next/navigation';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const cities = [
  { name: 'Mumbai', coordinates: [72.8777, 19.076] as [number, number], gcpRegion: 'asia-south1', country: 'India' },
  { name: 'Jakarta', coordinates: [106.8167, -6.2] as [number, number], gcpRegion: 'asia-southeast2', country: 'Indonesia' },
  { name: 'Singapore', coordinates: [103.8519, 1.2902] as [number, number], gcpRegion: 'asia-southeast1', country: 'Singapore' },
];

const clickableCountries = ['India', 'Indonesia', 'Singapore'];

const asianCountries = [
  'India', 'China', 'Indonesia', 'Pakistan', 'Bangladesh', 'Japan', 'Philippines', 'Vietnam', 'Iran', 'Turkey', 'Thailand', 'Myanmar', 'South Korea', 'Iraq', 'Afghanistan', 'Yemen', 'Uzbekistan', 'Malaysia', 'Saudi Arabia', 'Nepal', 'North Korea', 'Syria', 'Sri Lanka', 'Kazakhstan', 'Cambodia', 'Jordan', 'United Arab Emirates', 'Tajikistan', 'Azerbaijan', 'Israel', 'Laos', 'Turkmenistan', 'Kyrgyzstan', 'Singapore', 'Lebanon', 'State of Palestine', 'Oman', 'Kuwait', 'Georgia', 'Mongolia', 'Qatar', 'Armenia', 'Bahrain', 'Timor-Leste', 'Cyprus', 'Bhutan', 'Maldives', 'Brunei'
];

const MapChart = () => {
  const router = useRouter();

  return (
    <>
      <style>
        {`
          @keyframes blinker {
            50% {
              opacity: 0;
            }
          }
          .flashing-dot {
            animation: blinker 1s linear infinite;
            cursor: pointer;
          }
        `}
      </style>
            <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          rotate: [-105, -15, 0],
          scale: 500,
        }}
      >

        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies
              .filter((d: any) => asianCountries.includes(d.properties.name))
              .map((geo) => {
                const isClickable = clickableCountries.includes(geo.properties.name);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                                        onClick={() => {
                      if (isClickable) {
                        const cityData = cities.find(c => c.country === geo.properties.name);
                        if (cityData) {
                          router.push(`/projects?city=${cityData.name}&gcpRegion=${cityData.gcpRegion}`);
                        }
                      }
                    }}
                                                                                style={{
                      default: {
                        fill: '#F5F4F6', // Neutral fill color
                        stroke: '#D6D6DA',
                        outline: 'none',
                      },
                      hover: {
                        fill: isClickable ? '#87CEFA' : '#F5F4F6',
                        stroke: '#D6D6DA',
                        outline: 'none',
                        cursor: isClickable ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: isClickable ? '#B0E2FF' : '#F5F4F6',
                        stroke: '#D6D6DA',
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
          }
        </Geographies>
                        {cities.map(({ name, coordinates, gcpRegion, country }) => {
          let textProps = { x: 0, y: 20, textAnchor: 'middle' };
          let content;

          if (name === 'Jakarta') {
            textProps = { x: -10, y: 5, textAnchor: 'end' };
            content = (
              <>
                <tspan x={textProps.x} dy="0">{name}</tspan>
                <tspan x={textProps.x} dy="1.2em">{gcpRegion}</tspan>
                <tspan x={textProps.x} dy="1.2em">{country}</tspan>
              </>
            );
          } else if (name === 'Singapore') {
            textProps = { x: 0, y: -15, textAnchor: 'middle' };
            content = (
              <>
                <tspan x="0" dy="-2.4em">{name}</tspan>
                <tspan x="0" dy="1.2em">{gcpRegion}</tspan>
                <tspan x="0" dy="1.2em">{country}</tspan>
              </>
            );
          } else { // Mumbai
            content = (
              <>
                <tspan x="0" dy="1.2em">{name}</tspan>
                <tspan x="0" dy="1.2em">{gcpRegion}</tspan>
                <tspan x="0" dy="1.2em">{country}</tspan>
              </>
            );
          }

          return (
            <Marker key={name} coordinates={coordinates}>
              <circle
                r={4}
                fill="#F00"
                className="flashing-dot"
                onClick={() => router.push(`/projects?city=${name}&gcpRegion=${gcpRegion}`)}
              />
              <text
                x={textProps.x}
                y={textProps.y}
                textAnchor={textProps.textAnchor}
                style={{ fontFamily: 'system-ui', fill: '#5D5A6D', fontSize: '10px' }}
              >
                {content}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
    </>
  );
};

const LandingPage = () => {
  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <MapChart />
    </div>
  );
};

export default LandingPage;
