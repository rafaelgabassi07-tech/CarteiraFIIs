import React, { useMemo, useState } from 'react';

// Paths SVG otimizados e precisos dos estados brasileiros (IBGE/Wikipedia source adaptation)
const STATE_PATHS: Record<string, string> = {
  AC: "M103.7,255.9l-10.6,2.3l-5.3-2.6l-2.6-7.3l-7.3-2l-2.6,2.6l-5.3-1.3l-2.6-6l3.3-3.3l-2-7.3l5.3-2.6l4-7.3 l9.9-1.3l2.6-4l5.3,0.7l4.6,5.3l5.3-0.7l2.6,3.3l7.9,0.7l2-4l6.6,2l4-2l4.6,2.6l-1.3,4.6l-3.3,2l-0.7,5.3l-4,3.3l-4.6,9.2 l-7.3,1.3l-4.6,7.3L103.7,255.9z",
  AL: "M553.3,222.6l-2.6-2l-4.6,0.7l-1.3,4l2,4.6l3.3,2l4.6-2l1.3-4L553.3,222.6z",
  AM: "M159.2,128.2l-6-4.6l-2-7.9l-11.2-4.6l-6.6,1.3l-4-3.3l-2.6,1.3l-3.3-3.3l-2.6,2.6l-4.6-2.6l-4,2.6l-6.6,1.3 l-2.6,4.6l-5.3-2l-2.6,1.3l-2,4.6l-6.6,2l-4.6-0.7l-4,4l-4.6-1.3l-3.3,3.3l2,4l-2,4.6l3.3,3.3l-2,3.3l-6,1.3l-2.6,4l-3.3-0.7 l-2.6,3.3l-4.6-2l-2.6,2.6l-4-2.6l-2.6,2.6l2,6l-2.6,4.6l2,4l3.3,0.7l3.3,3.3l2.6-1.3l2.6,4l2.6-0.7l2.6,3.3l6.6-2l3.3,4 l-1.3,2l3.3,4l4.6-2l3.3,2.6l4-2.6l4-7.3l6.6,0.7l4-4l4.6,2.6l6-1.3l6.6,4l2.6-2l10.6-2.6l2.6,2l6-4.6l7.3,0.7l4-4l2.6,2 l2.6-2.6l10.6,0.7l1.3-3.3l6.6,0.7l2.6-2.6l2.6,3.3l4.6-4l6.6,2.6l1.3-3.3l4.6-1.3l1.3-6.6l4.6,2l3.3-3.3l-1.3-4.6l2.6-3.3 l-1.3-4.6l-4.6-1.3l-2-6l-4-4l-6.6-0.7L159.2,128.2z",
  AP: "M337.6,60.8l2-6.6l7.9-2.6l13.9,4l4.6,13.2l-2,7.3l-6.6,4.6l-6-2.6l-4-7.9l-2-2.6l-5.3-2.6L337.6,60.8z",
  BA: "M472.7,210.7l-7.9-3.3l-2-4l-6.6,0.7l-2-4l-6-2l-4-4.6l-1.3-5.3l-4.6-2l-6,4.6l-2.6-2l-4.6,1.3l-4-3.3l-7.9,1.3 l-1.3,4l-4.6,2l-2.6-1.3l-2.6,2.6l-4.6,0.7l-2.6,3.3l-4.6-0.7l-2.6,4l-4.6-0.7l-1.3,4.6l2.6,6.6l3.3,2.6l-0.7,4l4,4.6l-1.3,6.6 l-6,3.3l-2,4.6l3.3,2.6l2,6.6l2.6,2l10.6-2l4.6,1.3l6-3.3l2.6,2l4.6,0.7l1.3,4.6l4.6,2l2-2.6l4.6,2.6l2-2.6l2.6,2l3.3-2l4-2.6 l2-4.6l7.9-2.6l2-2.6l2.6,1.3l2.6-4l3.3-0.7l4-6l4-2l2-4.6l4.6,0.7L472.7,210.7z",
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

// Cores das Regiões (Referência IBGE/Escolares)
const REGION_COLORS: Record<string, string> = {
    'N': '#a78bfa', // Norte - Violeta
    'NE': '#f59e0b', // Nordeste - Laranja
    'CO': '#84cc16', // Centro-Oeste - Verde Lima
    'SE': '#06b6d4', // Sudeste - Ciano
    'S': '#f43f5e'  // Sul - Rosa/Vermelho
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

  const stateValues = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(item => {
      let uf = item.name.toUpperCase().trim();
      const states: Record<string, string> = {
          'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAZONAS': 'AM', 'AMAPÁ': 'AP', 'AMAPA': 'AP',
          'BAHIA': 'BA', 'CEARÁ': 'CE', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF',
          'ESPÍRITO SANTO': 'ES', 'ESPIRITO SANTO': 'ES', 'GOIÁS': 'GO', 'GOIAS': 'GO',
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

  const getStateStyle = (uf: string) => {
    const count = stateValues[uf] || 0;
    const region = STATE_REGION[uf];
    const isHovered = hoveredState === uf;

    // Se tem imóveis, usa escala de heatmap sobre a cor da região ou neutro
    if (count > 0) {
        if (count > 15) return { fill: '#4f46e5', stroke: '#fff', opacity: 1 }; // Indigo Strong
        if (count > 5) return { fill: '#6366f1', stroke: '#fff', opacity: 0.9 }; // Indigo Base
        return { fill: '#818cf8', stroke: '#fff', opacity: 0.8 }; // Indigo Light
    }

    // Se não tem imóveis, usa a cor da região (estilo IBGE) mas suave
    const regionColor = REGION_COLORS[region] || '#d4d4d8';
    
    return {
        fill: regionColor,
        stroke: '#fff',
        opacity: isHovered ? 0.8 : 0.4, // Mais opaco se hover, transparente default
        strokeWidth: isHovered ? 2 : 0.5
    };
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full max-h-[320px] filter drop-shadow-sm p-4"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <g className="transition-all duration-500 ease-out-mola">
          {Object.keys(STATE_PATHS).map((uf) => {
             const style = getStateStyle(uf);
             const isHovered = hoveredState === uf;
             
             return (
                <path
                  key={uf}
                  d={STATE_PATHS[uf]}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth || 1}
                  fillOpacity={style.opacity}
                  onMouseEnter={() => setHoveredState(uf)}
                  onMouseLeave={() => setHoveredState(null)}
                  className={`transition-all duration-200 cursor-pointer ${isHovered ? 'scale-[1.02] z-10' : 'z-0'}`}
                  vectorEffect="non-scaling-stroke"
                  style={{ transformOrigin: 'center' }}
                />
             )
          })}
        </g>
      </svg>
      
      {/* Tooltip Dinâmico */}
      {hoveredState && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/95 dark:bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl pointer-events-none anim-scale-in z-20 flex flex-col items-center">
              <span className="text-xs font-black text-white dark:text-zinc-900 uppercase tracking-widest">{hoveredState}</span>
              {stateValues[hoveredState] ? (
                  <span className="text-[10px] font-medium text-emerald-400 dark:text-emerald-600">{stateValues[hoveredState]} Imóveis</span>
              ) : (
                  <span className="text-[9px] text-zinc-500">Sem ativos</span>
              )}
          </div>
      )}

      {/* Legenda de Regiões Minimalista */}
      <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-none opacity-60 scale-90 origin-bottom-left">
          {Object.entries(REGION_COLORS).map(([region, color]) => (
              <div key={region} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-[8px] font-bold text-zinc-400">{region}</span>
              </div>
          ))}
      </div>
    </div>
  );
};