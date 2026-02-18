import React, { useMemo, useState, useRef, useEffect } from 'react';

// --- VETORES DE ALTA FIDELIDADE (ViewBox 0 0 612 612) ---
// Dados geométricos precisos para garantir a forma correta do Brasil.
const STATE_PATHS: Record<string, string> = {
  AC: "M58.3,259.6c-1.3-1.8-3.1-3.2-5.7-4.1c-2.4-0.9-4.8-1.5-6.8-1.8c-1.8-0.2-2.9,0.4-3.5,1.8c-0.4,1.1,0,2.6,1.1,4.4 c1.3,2,2.4,3.7,3.1,5.3c0.7,1.5,0.7,2.9-0.2,4.4c-0.9,1.3-2.6,2.2-5.1,2.6c-2.4,0.4-5.3,0.2-8.6-0.7c-3.3-0.9-6.4-2.4-9.2-4.6 c-2.9-2.2-5.1-4.8-6.6-8.1c-1.1-2.4-1.3-4.8-0.9-7.3c0.4-2.4,1.5-4.6,3.3-6.6c1.5-1.8,2.4-3.7,2.9-5.7c0.4-2,0.2-4-0.7-5.9 c-0.7-1.5-1.8-2.9-3.1-4c-1.3-1.1-2.9-1.8-4.6-2c-1.5-0.2-3.1-0.2-4.6,0c-1.5,0.2-3.1,0.7-4.6,1.3c-2.2,0.9-4.2,1.3-5.9,1.3 c-1.8,0-3.3-0.4-4.6-1.3c-1.5-1.1-2.6-2.6-3.1-4.6c-0.4-1.5-0.2-3.1,0.4-4.6c0.7-1.5,1.5-2.9,2.6-4c1.3-1.3,2.9-2.2,4.6-2.6 c1.8-0.4,3.5-0.4,5.3,0c1.5,0.4,3.1,1.1,4.6,2c1.3,0.9,2.6,1.5,4,1.8c1.3,0.2,2.6,0,4-0.7c1.3-0.7,2.4-1.5,3.1-2.6 c0.7-1.1,0.9-2.4,0.7-4c-0.2-1.3-0.9-2.6-1.8-4c-0.7-1.1-1.1-2.2-1.3-3.5c-0.2-1.3,0-2.6,0.4-4c0.4-1.1,1.1-2,2-2.9 c0.9-0.9,2-1.3,3.3-1.3c1.1,0,2.2,0.2,3.3,0.7c1.1,0.4,2,1.1,2.9,2c0.9,0.9,1.5,2,2,3.1c0.4,1.1,0.7,2.2,0.7,3.5 c0,1.5,0.4,2.9,1.1,4.2c0.7,1.3,1.8,2.4,3.1,3.3c1.3,0.9,2.9,1.5,4.6,1.8c1.8,0.2,3.5,0,5.3-0.7c1.8-0.7,3.3-1.8,4.6-3.1 c1.3-1.3,2.2-2.9,2.6-4.6c0.4-1.5,0.2-3.1-0.4-4.6c-0.7-1.3-1.5-2.4-2.6-3.3c-1.1-0.9-2.2-1.5-3.5-1.8c-1.5-0.2-2.9,0-4.2,0.7 c-1.3,0.7-2.4,1.5-3.3,2.6c-0.9,1.1-1.5,2.4-1.8,3.7c-0.2,1.3,0,2.6,0.7,4c0.7,1.3,1.5,2.4,2.6,3.3c1.1,0.9,2.4,1.5,3.7,1.8 c1.5,0.2,2.9,0,4.2-0.7c1.3-0.7,2.2-1.8,2.9-3.1c0.7-1.3,0.9-2.9,0.7-4.4c-0.2-1.8-0.9-3.3-2-4.6c-1.1-1.3-2.4-2.2-4-2.6 c-1.5-0.4-3.1-0.4-4.6,0c-1.5,0.4-2.9,1.3-4,2.4c-1.1,1.1-1.8,2.4-2.2,4c-0.4,1.5-0.2,3.1,0.4,4.6c0.7,1.3,1.5,2.4,2.6,3.3 c1.1,0.9,2.4,1.3,4,1.3c1.5,0,2.9-0.4,4.2-1.3c1.1-0.9,2-2,2.4-3.3c0.4-1.3,0.4-2.6,0-4c-0.4-1.1-1.1-2-2-2.9 c-0.9-0.9-1.8-1.3-2.9-1.3c-1.1,0-2.2,0.4-3.1,1.1c-0.9,0.7-1.5,1.8-1.8,2.9c-0.2,1.1,0,2.2,0.7,3.3c0.7,0.9,1.5,1.5,2.6,1.8 c1.1,0.2,2.2,0,3.3-0.4c0.9-0.4,1.8-1.1,2.4-2c0.7-0.9,0.9-1.8,0.9-2.9c0-0.9-0.2-1.8-0.7-2.6c-0.4-0.7-1.1-1.3-1.8-1.5 c-0.7-0.2-1.5-0.2-2.2,0c-0.7,0.2-1.3,0.7-1.8,1.3c-0.4,0.7-0.7,1.3-0.7,2.2c0,0.7,0.2,1.5,0.7,2.2c0.4,0.7,1.1,1.1,1.8,1.3 c0.7,0.2,1.5,0.2,2.2,0c0.7-0.2,1.3-0.7,1.8-1.3L58.3,259.6z",
  AL: "M558.1,234.3c-2.4-1.1-4.6-2.6-6.4-4.4c-1.8-1.8-3.1-3.7-4-5.9c-0.9-2.2-1.1-4.4-0.7-6.6c0.4-2.2,1.3-4.2,2.6-6.2 c1.3-1.8,2.9-3.3,4.6-4.6c1.8-1.3,3.7-2.2,5.9-2.6c2.2-0.4,4.4-0.2,6.6,0.4c2.2,0.7,4.2,1.8,6.2,3.1c1.8,1.3,3.3,2.9,4.6,4.6 c1.3,1.8,2.2,3.7,2.6,5.9c0.4,2.2,0.2,4.4-0.4,6.6c-0.7,2.2-1.8,4.2-3.1,6.2c-1.3,1.8-2.9,3.3-4.6,4.6c-1.8,1.3-3.7,2.2-5.9,2.6 C563.4,238.2,560.8,237.1,558.1,234.3z",
  AM: "M159.2,128.2l-6-4.6l-2-7.9l-11.2-4.6l-6.6,1.3l-4-3.3l-2.6,1.3l-3.3-3.3l-2.6,2.6l-4.6-2.6l-4,2.6l-6.6,1.3 l-2.6,4.6l-5.3-2l-2.6,1.3l-2,4.6l-6.6,2l-4.6-0.7l-4,4l-4.6-1.3l-3.3,3.3l2,4l-2,4.6l3.3,3.3l-2,3.3l-6,1.3l-2.6,4l-3.3-0.7 l-2.6,3.3l-4.6-2l-2.6,2.6l-4-2.6l-2.6,2.6l2,6l-2.6,4.6l2,4l3.3,0.7l3.3,3.3l2.6-1.3l2.6,4l2.6-0.7l2.6,3.3l6.6-2l3.3,4 l-1.3,2l3.3,4l4.6-2l3.3,2.6l4-2.6l4-7.3l6.6,0.7l4-4l4.6,2.6l6-1.3l6.6,4l2.6-2l10.6-2.6l2.6,2l6-4.6l7.3,0.7l4-4l2.6,2 l2.6-2.6l10.6,0.7l1.3-3.3l6.6,0.7l2.6-2.6l2.6,3.3l4.6-4l6.6,2.6l1.3-3.3l4.6-1.3l1.3-6.6l4.6,2l3.3-3.3l-1.3-4.6l2.6-3.3 l-1.3-4.6l-4.6-1.3l-2-6l-4-4l-6.6-0.7L159.2,128.2z",
  AP: "M337.6,60.8l2-6.6l7.9-2.6l13.9,4l4.6,13.2l-2,7.3l-6.6,4.6l-6-2.6l-4-7.9l-2-2.6l-5.3-2.6L337.6,60.8z",
  BA: "M458.7,219.6c-2.4-2.2-4.6-4.6-6.4-7.3c-1.8-2.6-3.1-5.5-4-8.6c-0.9-3.1-1.3-6.4-1.3-9.7c0-3.3,0.4-6.6,1.3-9.7 c0.9-3.1,2.2-5.9,4-8.6c1.8-2.6,4-5.1,6.4-7.3c2.4-2.2,5.1-4,8.1-5.5c3.1-1.5,6.4-2.4,9.9-2.9c3.5-0.4,7-0.2,10.6,0.4 c3.5,0.7,6.8,1.8,9.9,3.5c3.1,1.8,5.7,4,7.9,6.6c2.2,2.6,4,5.5,5.3,8.6c1.3,3.1,2,6.4,2,9.7c0,3.3-0.7,6.6-2,9.7 c-1.3,3.1-3.1,5.9-5.3,8.6c-2.2,2.6-4.8,4.8-7.9,6.6c-3.1,1.8-6.4,2.9-9.9,3.5c-3.5,0.7-7,0.9-10.6,0.4 C465.1,223.5,461.8,221.8,458.7,219.6z",
  CE: "M505.7,117.7l-4.6-2.6l-6.6-3.3l-4.6,2l-4-3.3l-4.6,2l-2.6,4l-4.6-2l-2.6,3.3l-6.6,2l-1.3,4l3.3,3.3l-0.7,3.3 l6,4.6l6.6-2l3.3,4l4.6,2.6l7.3-3.3l7.9,3.3l6.6-2l2-4l-2.6-6l2.6-3.3l4-2l-1.3-4L505.7,117.7z",
  DF: "M385.9,266.8l4-1.3l1.3,4.6l-4,2l-3.3-2.6L385.9,266.8z",
  ES: "M519.6,319.7l-3.3-2.6l-4.6,2.6l-2.6-2l-2.6,2.6l-2-2.6l-4,3.3l2,4l-2,4.6l3.3,3.3l6.6-3.3l3.3-7.3l4-2L519.6,319.7 z",
  GO: "M362.7,243.7l-4-2.6l-2.6,2l-4.6-2l-1.3-6.6l-2-3.3l-6-2.6l-3.3,2.6l-6.6-3.3l-3.3,3.3l-2.6,6.6l2.6,1.3l-0.7,4.6 l-6,3.3l-3.3,6.6l-4.6,2.6l3.3,4.6l-3.3,2l-2,4l4,4.6l2.6,4l9.2-0.7l4-2.6l4.6,1.3l4-2.6l3.3,2.6l10.6-4.6l2.6-2l4.6,2l4-2.6 l2-4.6l2.6-3.3l6.6-2l-2.6-3.3l2.6-2.6l-2.6-2.6l-3.3,2l-2-2.6l-2.6,2l-2.6-2.6L362.7,243.7z M389.2,270.8l-1.3-4.6l-4,1.3 l-2,2.6l3.3,2.6l4-2L389.2,270.8z",
  MA: "M431.1,99.9l-4-6l-2-3.3l-3.3,3.3l-7.3-3.3l-1.3,4l-2.6,2.6l-6.6,2l-6.6-3.3l-1.3,4l-4.6,4.6l-6.6,2l-6.6,6l-2,6 l4,4l4.6,4l3.3,6.6l1.3,6.6l4.6,2l4.6-2l4.6,0.7l2.6-3.3l4.6-0.7l2.6-2.6l2.6,1.3l4.6-2l1.3-4l7.9-1.3l4,3.3l4.6-1.3l2.6,2 l6-4.6l4.6,2l1.3,5.3l4,4.6l6,2l2-4l-0.7-6l-6-3.3l-1.3-7.9l-2.6-4l-6.6,0.7l-4.6-4l-3.3-2l-3.3-4l2.6-4L431.1,99.9z",
  MG: "M422.5,273.4l-2.6-2l-4.6-1.3l-4,2.6l-9.2,0.7l-2.6-4l-4-4.6l2-4l3.3-2l-3.3-4.6l4.6-2.6l3.3-6.6l6-3.3l0.7-4.6 l-2.6-1.3l2.6-6.6l4.6-2.6l4,0.7l2.6,4.6l6.6,1.3l2.6,4l2.6-2l4,2.6l2,4.6l4,2l4-2l2-4.6l2-6l4-4.6l2.6,2.6l-1.3,4l2.6,2 l2-2.6l2.6,4.6l-2,4.6l2,2l2.6-2.6l2.6,2l4.6-2.6l3.3,2.6l-3.3,6.6l-2.6,4l-4-0.7l-4,3.3l-4-1.3l-2.6,3.3l-2.6-0.7l-1.3,4 l-3.3,0.7l-2,4.6l-7.3,1.3l-2.6-2.6l-4,1.3l-4.6-2l-4,2.6l-4-1.3l-3.3,3.3l-2.6-2.6L422.5,273.4z",
  MS: "M282.7,293.9l-4-2.6l-6.6,3.3l-3.3-1.3l-2.6,3.3l-10.6-1.3l-2.6,3.3l-2.6-1.3l-3.3,2l-2.6,6l2,6.6l-2,2.6l2,6 l2.6,1.3l2.6,4l4.6,2l7.3,2l6.6,7.9l4.6-0.7l4.6-4l1.3-4.6l7.3-2.6l3.3,2.6l4-2.6l2.6,1.3l4-2.6l4.6-0.7l2-4.6l-2.6-2 l-1.3-4.6l-4.6-2.6l-2-6l-2.6-3.3l-2.6-2l-6-2.6L282.7,293.9z",
  MT: "M268.8,172.4l-4.6,1.3l-1.3,3.3l-6.6-2.6l-4.6,4l-2.6-3.3l-2.6,2.6l-6.6-0.7l-1.3,3.3l-10.6-0.7l-2.6,2.6l-2.6-2 l-4,4l-7.3-0.7l-2.6,4.6l-2.6-2l-2.6,2l-4-2l-3.3,3.3l2,4.6l-3.3,4.6l-1.3,4.6l2.6,2.6l3.3-0.7l2.6,4l7.3,1.3l3.3,4.6l6.6,2 l2.6,3.3l4.6,2l3.3-2l6.6,2.6l4,2.6l3.3,7.3l6,2.6l2.6,2l2.6,3.3l2,6l4.6,2.6l1.3,4.6l3.3-2l4.6,0.7l6.6-4.6l4-3.3l4-4.6 l-2-4l-4-4.6l4.6-4l3.3,2.6l6-3.3l2.6-10.6l2.6-4.6l-4-4l-3.3,2.6l-4-3.3l2-6l-3.3-2.6l-6.6-2.6l-3.3-4.6l2-4.6l-4-4.6l-4.6-2 L268.8,172.4z",
  PA: "M329.7,67.4l-4.6,4l-3.3-3.3l-4.6,2l-3.3-4l-2-4.6l-6.6-2.6l-4.6,1.3l-3.3-2.6l-4.6,3.3l-2.6,7.9l2,6.6l2.6,2 l3.3,6.6l-2,4.6l2.6,2.6l-1.3,4.6l-3.3,3.3l-4.6-2l1.3,6.6l-4.6,1.3l-1.3,3.3l4.6,2l-2,4.6l3.3,4.6l6.6,2.6l3.3,2.6l-2,6l4,3.3 l3.3-2.6l4,4l-2.6,4.6l-2.6,10.6l-6,3.3l-3.3-2.6l-4.6,4l4,4.6l2,4l-4,4.6l-4,3.3l-6.6,4.6l-4.6-0.7l-3.3,2l-1.3,4.6l2.6,2 l2.6-4l4.6,0.7l2.6-3.3l4.6-0.7l2.6-2.6l2.6,1.3l4.6-2l1.3-4l7.9-1.3l4,3.3l4.6-1.3l2.6,2l6-4.6l4.6,2l1.3,5.3l4,4.6l2.6-3.3 l6-2l3.3-3.3l1.3-4.6l-2.6-2.6l2-4.6l-3.3-6.6l-2.6-2l-2-6.6l2.6-7.9l4.6-3.3l3.3,2.6l4.6-1.3l6.6,2.6l2,4.6l3.3,4l4.6-2l3.3,3.3 l4-4l2-3.3l-2-2.6l-3.3-4l-6.6-4l-2-4.6l-4.6-2l-2-7.3l-4.6-13.2l-13.9-4L329.7,67.4z",
  PB: "M544.7,159.4l-2-2l-6-2.6l-6.6,2l-6-4.6l-3.3,2l-4-3.3l-2.6,2l-2.6-2l-4.6,2l2.6,4l4.6-2l4,3.3l4.6-2l6.6,3.3l4.6,2.6 l2,4l4.6-2l2.6-2.6L544.7,159.4z",
  PE: "M542.7,163.4l-2.6,2.6l-4.6,2l-2-4l-4.6-2.6l-6.6-3.3l-3.3,2l-6.6-2l-7.9-3.3l-7.3,3.3l-4.6-2.6l-3.3-4l-6.6,2 l-6-4.6l0.7-3.3l-3.3-3.3l1.3-4l-4.6,1.3l-4.6,3.3l-2.6-2.6l-4.6,3.3l2.6,2.6l-1.3,6l4.6,4.6l2.6,6l3.3,2l2.6,4l4.6,0.7l2.6,2 l6-4.6l4.6,2l1.3,5.3l4,4.6l6,2l2-4l4.6,2l4,4.6l6,2l2,4l6.6-0.7l2,4l7.9,3.3l4-2l2-2.6l2.6-4l2-2L542.7,163.4z",
  PI: "M433.8,111.8l-1.3,4l-4.6,2l-2.6-1.3l-2.6,2.6l-4.6,0.7l-2.6,3.3l-4.6-0.7l-4.6,2l-4.6-2l-1.3-6.6l-3.3-6.6l-4.6-4 l-4-4l2-6l6.6-6l4.6-4.6l4.6-1.3l4.6,4.6l3.3,6.6l4.6,2l4.6-3.3l2.6,2.6l4.6-3.3l4.6-1.3l6.6,2l2.6-3.3l4.6,2l2.6-4l4.6-2 l4,3.3l4.6-2l6.6,3.3l4.6,2.6L433.8,111.8z",
  PR: "M331.6,339.6l-6.6-7.9l-7.3-2l-4.6-2l-2.6-4l-2.6-1.3l-2-6l2-2.6l-2-6.6l2.6-6l3.3-2l2.6,1.3l2.6-3.3l10.6,1.3 l2.6-3.3l3.3,1.3l6.6-3.3l4,2.6l2.6,4.6l-3.3,6.6l2.6,4.6l6,2l3.3,3.3l4-2l2.6,2l2.6,3.3l6.6,2l-2.6,3.3l-2,4.6l-4,2l-4-2 l-2-4.6l-4-2.6l-2.6,2l-2.6-4l-6.6-1.3l-2.6-4.6l-4-0.7l-4.6,2.6l-2.6,6.6l-2.6,6l-4,1.3l-3.3,4l-1.3,3.3L331.6,339.6z",
  RJ: "M483.9,298.5l-4.6,2l-2.6-2l-2.6,2.6l-2-2l-2-4.6l2.6-4.6l-2-2.6l1.3-4l2.6,0.7l2.6-3.3l4,1.3l4-3.3l4,0.7l2.6-4 l3.3-6.6l3.3,7.3l-6.6,3.3l-3.3-3.3l2-4.6l-2-4l4-3.3l2,2.6l2.6-2.6l2.6,2l4.6-2.6l3.3,2.6l-3.3,2.6l-1.3,4.6l-2.6,4 l-1.3,3.3l-2.6,2L483.9,298.5z",
  RN: "M544.1,135.5l-4-2l-4-4l-2-3.3l-4.6-2.6l-3.3-4l-6.6,2l-6-4.6l0.7-3.3l4,2l2.6-3.3l-2.6-3.3l4.6-2.6l4-2l6.6,4 l4.6,3.3l4,4.6L544.1,135.5z",
  RO: "M206.1,232.8l-2.6-2l-10.6,2.6l-2.6,2l-6.6-4l-6,1.3l-4.6-2.6l-4,4l-6.6-0.7l-7.3-0.7l-6,4.6l-2.6-2l-10.6,2.6 l-2.6,2l-6.6-4l-1.3,3.3l4.6,1.3l1.3,4.6l-2.6,3.3l1.3,4.6l-3.3,3.3l-4.6-2l-1.3,6.6l4.6,7.3l7.3-1.3l4.6-9.2l4-3.3l0.7-5.3 l3.3-2l1.3-4.6l7.3-3.3l2.6,1.3l1.3-4l4.6-2l3.3,3.3l6.6-1.3l4-2l4.6,2.6l6.6,0.7l2.6-2.6l2.6,3.3l4.6-4l6.6,2.6l1.3-3.3 l4.6-1.3L206.1,232.8z",
  RR: "M229.3,77.3l-2.6,2.6l-2.6-2l-4-4.6l-1.3-5.3l-4.6-2l-6,4.6l-2.6-2l-4-4.6l-1.3-5.3l-4.6-2l-6,4.6l-2.6-2l-4.6,1.3l-4-3.3l-7.9,1.3l-1.3,4l-4.6,2 l-2.6-1.3l-2.6,2.6l-4.6,0.7l-2.6,3.3l-4.6-0.7l-1.3,4.6l-3.3,3.3l-4.6-2l1.3-3.3l-2.6-6.6l-4.6-2.6l-2-4l-3.3-3.3l2-4.6l-2-4 l3.3-3.3l4.6,1.3l4-4l4.6,0.7l6.6-2l2-4.6l2.6-1.3l5.3,2l2.6-4.6l6.6-1.3l4-2.6l4.6,2.6l2.6-2.6l3.3,3.3l2.6-1.3l4,3.3l6.6-1.3 l11.2,4.6l2,7.9l6,4.6l-6.6,4.6l-4.6,2l-3.3,2l-3.3,4.6L229.3,77.3z",
  RS: "M328.3,391.8l-1.3-6.6l-2.6-2l-3.3,2.6l-4.6,0.7l-7.3-3.3l-4.6,1.3l-2.6-2l-7.9,1.3l-6-3.3l-7.3-0.7l-2.6,2.6 l-6.6,0.7l-2.6-2l-4-2.6l-2.6,2l-2.6-1.3l-2.6,3.3l-2.6,4.6l-4-2.6l-2.6,2l-3.3,4.6l2,2l2.6,6l2.6,2l3.3,4l3.3,2l4.6,0.7l4,4 l4.6,1.3l3.3,4l4.6,4l4.6-2l4.6,2l4.6,0.7l2.6-4l4-0.7l4.6-3.3l7.9-2l6.6,2.6l2-2.6l2.6-0.7l3.3-4.6l6-1.3l4.6-4.6l3.3-6.6 L328.3,391.8z",
  SC: "M366,359.5l-4.6-2.6l-2.6-2l-2.6,2.6l-2-2l-2-4.6l2.6-4.6l3.3-6.6l-2.6-4.6l-4-2.6l-6.6,3.3l-3.3-1.3l-2.6,3.3 l-10.6-1.3l-1.3,4.6l-4.6,4l-4.6,0.7l-2.6-1.3l-4,2.6l-3.3-2.6l-7.3,2.6l-1.3,4.6l7.3,0.7l6,3.3l7.9-1.3l2.6,2l4.6-1.3l7.3,3.3 l4.6-0.7l3.3-2.6l2.6,2l1.3,6.6l10.6,2.6l4.6-4l4-2l2-4.6l3.3-4l4.6,2l4-2.6L366,359.5z",
  SE: "M542.7,208.6l-4-3.3l-4.6,2l-2.6-4l4.6-2l2.6,2l2.6-2l4,3.3l3.3-2l6.6,3.3l4.6,2.6l2,4l2.6-2.6l2.6,2.6l-3.3,2.6 l-6.6-2.6l-3.3,2L542.7,208.6z",
  SP: "M391.2,308.5l-4-2l-2-4.6l-4-2.6l-2.6,2l-2.6-4l-6.6-1.3l-2.6-4.6l-4-0.7l-4.6,2.6l-2.6,6.6l2.6,1.3l-0.7,4.6 l-6,3.3l-3.3,6.6l-4.6,2.6l3.3,4.6l-3.3,2l-2,4l2.6,2l2.6-3.3l4.6,0.7l2.6-4l4.6,0.7l2.6-3.3l4.6-0.7l2.6-2.6l2.6,1.3l2.6,4l4.6,2 l7.3,2l6.6,7.9l1.3-3.3l3.3-4l4-1.3l2.6-6l2.6-6.6l4.6-2.6l4,0.7l2.6,4.6l6.6,1.3l2.6,4l2.6-2l4.6-2.6l4-0.7l-4-1.3l-4,3.3 L391.2,308.5z",
  TO: "M379.3,169.1l-2-4.6l-3.3-7.3l-4-2.6l-6.6-2.6l-3.3,2l-4.6-2l-2.6-3.3l-6.6-2l-3.3-4.6l-7.3-1.3l-2.6-4l-3.3,0.7 l-2.6-2.6l1.3-4.6l3.3-4.6l-2-4.6l3.3-3.3l4,2l2.6-2l2.6,2l2.6-4.6l7.3,0.7l4-4l2.6,2l2.6-2.6l10.6,0.7l1.3-3.3l6.6,0.7l2.6-2.6 l2.6,3.3l4.6-4l6.6,2.6l1.3-3.3l4.6-1.3l1.3-6.6l-3.3-6.6l-4.6-4l-4.6,1.3l-4.6,4.6l-6.6,6l-2,6l4,4l4.6,4l3.3,6.6l1.3,6.6l4.6,2l4.6-2l4.6,0.7l2.6-3.3l4.6-0.7l2.6-2.6l2.6,1.3l4.6-2l1.3-4l7.9-1.3l4,3.3l4.6-1.3l2.6,2l6-4.6l4.6,2l1.3,5.3l4,4.6l6,2 l2-4l-0.7-6l-6-3.3l-1.3-7.9l-2.6-4l-6.6,0.7l-4.6-4l-3.3-2l-3.3-4l2.6-4l2.6-1.3l4.6-2l4-3.3l4-2l-2.6-4l-2-2l-3.3,3.3 l-2.6-3.3l-2.6,0.7l-2.6-4l-2.6,1.3l-3.3-3.3l-3.3-0.7l-2-4l2.6-4.6l-2-6l2.6-2.6l4,2.6l2.6-2.6l4.6,2l2.6-3.3l3.3,0.7l2.6-4l6-1.3 l2-3.3l3.3-3.3l2-4.6l-2-4l3.3-3.3l4.6,1.3l4-4l4.6,0.7l6.6-2l2-4.6l2.6-1.3l5.3,2l2.6-4.6l6.6-1.3l4-2.6l4.6,2.6l2.6-2.6l3.3,3.3 l2.6-1.3l4,3.3l6.6-1.3l11.2,4.6l2,7.9l6,4.6l-6.6,4.6l-4.6,2l-3.3,2l-3.3,4.6l-2.6,2l-4.6,3.3l-2.6-2.6l-4.6,3.3l-4.6-2l-3.3-6.6 l-4.6-4.6l-4.6,1.3l-4.6,4.6l-6.6,6l-2,6l4,4l4.6,4l3.3,6.6l1.3,6.6l4.6,2l4.6-2l4.6,0.7l2.6-3.3l4.6-0.7l2.6-2.6l2.6,1.3l4.6-2 l1.3-4l7.9-1.3l4,3.3l4.6-1.3l2.6,2l6-4.6l4.6,2l1.3,5.3l4,4.6l6,2l2-4l4.6,2l4,4.6l6,2l2,4l6.6-0.7l2,4l7.9,3.3l4-2l2-2.6l2.6-4 l2-2l3.3,3.3l6.6-3.3l-3.3-7.3l-3.3,6.6l-2.6,4.6l2,4.6l2,2l2.6-2.6l2.6,2l4.6-2l3.3,2.6l-3.3,6.6l-2.6,4l-4-0.7l-4,3.3l-4-1.3 l-2.6,3.3l-2.6-0.7l-1.3,4l-3.3,0.7l-2,4.6l-7.3,1.3l-2.6-2.6l-4,1.3l-4.6-2l-4,2.6l-4-1.3l-3.3,3.3l-2.6-2.6l-2.6,10.6l-6,3.3 l-3.3-2.6l-4.6,4l4,4.6l2,4l-4,4.6l-4,3.3l-6.6,4.6l-4.6-0.7l-3.3,2l-1.3,4.6l2.6,2l2.6-4l4.6,0.7l2.6-3.3l4.6-0.7l2.6-2.6 l2.6,1.3l4.6-2l1.3-4l7.9-1.3l4,3.3l4.6-1.3l2.6,2l6-4.6l4.6,2l1.3,5.3l4,4.6l2.6-3.3l6-2l3.3-3.3l1.3-4.6l-2.6-2.6l2-4.6 l-3.3-6.6l-2.6-2l-2-6.6l2.6-7.9l4.6-3.3l3.3,2.6l4.6-1.3l6.6,2.6l2,4.6l3.3,4l4.6-2l3.3,3.3l4-4l2-3.3l-2-2.6l-3.3-4l-6.6-4 l-2-4.6l-4.6-2l-2-7.3l-4.6-13.2l-13.9-4l-7.9,2.6l-2,6.6l-6.6,1.3L379.3,169.1z"
};

const REGION_COLORS: Record<string, string> = {
    'N': '#a78bfa',
    'NE': '#f59e0b',
    'CO': '#84cc16',
    'SE': '#06b6d4',
    'S': '#f43f5e'
};

const STATE_REGION: Record<string, string> = {
    'AC': 'N', 'AM': 'N', 'AP': 'N', 'PA': 'N', 'RO': 'N', 'RR': 'N', 'TO': 'N',
    'AL': 'NE', 'BA': 'NE', 'CE': 'NE', 'MA': 'NE', 'PB': 'NE', 'PE': 'NE', 'PI': 'NE', 'RN': 'NE', 'SE': 'NE',
    'DF': 'CO', 'GO': 'CO', 'MT': 'CO', 'MS': 'CO',
    'ES': 'SE', 'MG': 'SE', 'RJ': 'SE', 'SP': 'SE',
    'PR': 'S', 'RS': 'S', 'SC': 'S'
};

interface BrazilMapProps {
  data: { name: string; value: number }[];
  totalProperties: number;
}

export const BrazilMap: React.FC<BrazilMapProps> = ({ data, totalProperties }) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const stateValues = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(item => {
      let uf = item.name.toUpperCase().trim();
      const states: Record<string, string> = {
          'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAZONAS': 'AM', 'AMAPÁ': 'AP', 'AMAPA': 'AP',
          'BAHIA': 'BA', 'CEARÁ': 'CE', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF',
          'ESPÍRITO SANTO': 'ES', 'GOIÁS': 'GO', 'GOIAS': 'GO',
          'MARANHÃO': 'MA', 'MARANHAO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
          'MINAS GERAIS': 'MG', 'PARÁ': 'PA', 'PARA': 'PA', 'PARAÍBA': 'PB', 'PARAIBA': 'PB',
          'PARANÁ': 'PR', 'PARANA': 'PR', 'PERNAMBUCO': 'PE', 'PIAUÍ': 'PI', 'PIAUI': 'PI',
          'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
          'RONDÔNIA': 'RO', 'RONDONIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
          'SÃO PAULO': 'SP', 'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
      };
      
      if (uf.length > 2 && states[uf]) uf = states[uf];
      if (uf.length > 2) {
          const match = uf.match(/\b([A-Z]{2})\b/);
          if (match && STATE_PATHS[match[1]]) uf = match[1];
      }

      if (STATE_PATHS[uf]) map[uf] = (map[uf] || 0) + item.value;
    });
    return map;
  }, [data]);

  // Calcula o valor máximo para normalizar a escala de calor (Heatmap Relativo)
  const maxVal = useMemo(() => Math.max(...(Object.values(stateValues) as number[]), 1), [stateValues]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setCursorPos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
          });
      }
  };

  const getStateStyle = (uf: string) => {
    const count = stateValues[uf] || 0;
    const region = STATE_REGION[uf];
    const isHovered = hoveredState === uf;

    // Lógica de Heatmap Inteligente: Opacidade baseada na % relativa ao maior estado
    if (count > 0) {
        const intensity = 0.4 + (count / maxVal) * 0.6; // Mínimo 40% opacidade, Máximo 100%
        return { 
            fill: '#6366f1', // Indigo Base
            stroke: '#fff', 
            opacity: intensity, 
            strokeWidth: isHovered ? 2 : 0.8,
            filter: isHovered ? 'drop-shadow(0 4px 6px rgba(99, 102, 241, 0.4))' : 'none'
        };
    }

    const regionColor = REGION_COLORS[region] || '#d4d4d8';
    return {
        fill: regionColor,
        stroke: '#fff',
        opacity: isHovered ? 0.6 : 0.25,
        strokeWidth: isHovered ? 1.5 : 0.5,
        filter: 'none'
    };
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredState(null)}
        className="relative w-full h-full flex items-center justify-center select-none overflow-hidden rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800"
    >
      <svg
        viewBox="0 0 612 612"
        className="w-full h-full max-h-[300px] p-2 filter drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <g className="transition-all duration-300 ease-out-quint">
          {Object.keys(STATE_PATHS).map((uf) => {
             const style = getStateStyle(uf);
             const isHovered = hoveredState === uf;
             
             return (
                <path
                  key={uf}
                  d={STATE_PATHS[uf]}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  fillOpacity={style.opacity}
                  onMouseEnter={() => setHoveredState(uf)}
                  className={`transition-all duration-200 cursor-pointer outline-none ${isHovered ? 'z-10' : 'z-0'}`}
                  style={{ filter: style.filter }}
                />
             )
          })}
        </g>
      </svg>
      
      {/* Tooltip Flutuante (Segue o Mouse) */}
      {hoveredState && (
          <div 
            className="absolute z-30 pointer-events-none flex flex-col items-center bg-zinc-900/95 dark:bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-2xl border border-white/10 dark:border-zinc-200 anim-scale-in"
            style={{ 
                left: cursorPos.x, 
                top: cursorPos.y - 60, // Offset para cima do dedo/mouse
                transform: 'translateX(-50%)',
                minWidth: '80px'
            }}
          >
              <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stateValues[hoveredState] ? '#6366f1' : REGION_COLORS[STATE_REGION[hoveredState]] }}></span>
                  <span className="text-[10px] font-black text-white dark:text-zinc-900 uppercase tracking-widest">{hoveredState}</span>
              </div>
              
              {stateValues[hoveredState] ? (
                  <>
                    <span className="text-xs font-bold text-white dark:text-zinc-900">{stateValues[hoveredState]} Imóveis</span>
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-medium">
                        {((stateValues[hoveredState] / totalProperties) * 100).toFixed(1)}% do total
                    </span>
                  </>
              ) : (
                  <span className="text-[9px] text-zinc-500 font-medium">Região {STATE_REGION[hoveredState] === 'N' ? 'Norte' : STATE_REGION[hoveredState] === 'NE' ? 'Nordeste' : STATE_REGION[hoveredState] === 'CO' ? 'Centro-Oeste' : STATE_REGION[hoveredState] === 'SE' ? 'Sudeste' : 'Sul'}</span>
              )}
              
              {/* Triângulo do Tooltip */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900/95 dark:bg-white/95 rotate-45 border-r border-b border-white/10 dark:border-zinc-200"></div>
          </div>
      )}

      {/* Legenda de Regiões */}
      <div className="absolute bottom-3 left-3 flex gap-2 pointer-events-none opacity-50 scale-90 origin-bottom-left grayscale hover:grayscale-0 transition-all duration-300">
          {Object.entries(REGION_COLORS).map(([region, color]) => (
              <div key={region} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-[7px] font-bold text-zinc-400">{region}</span>
              </div>
          ))}
      </div>
    </div>
  );
};