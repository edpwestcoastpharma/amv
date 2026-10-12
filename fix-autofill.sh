#!/bin/bash
cat << 'NODE_SCRIPT' > rewrite-autofill.cjs
const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const replacement = `export function autoFillGroup(group: GroupData) {
  // Find the standard/nominal retention time for RRT calculations
  const refInj = group.injections.find(i => i.area !== null && i.area > 0 && i.rt !== null && i.rt > 0);
  const refRt = refInj?.rt || 13.958; // fallback to typical RT if none

  const updatedInjections = group.injections.map(inj => {
    const isBlank = (inj.area === null || inj.area <= 0) || (inj.rt === null || inj.rt <= 0) || /blank|placebo/i.test(inj.sampleName);
    
    let newInj = { ...inj };

    if (isBlank) {
      newInj.area = 0;
      newInj.height = 0;
      newInj.tailing = 0;
      newInj.plates = 0;
      newInj.rrt = "--";
      newInj.resolution = "--";
      newInj.areaPct = 0;
      newInj._trace = [];
    } else {
      // Auto-calculate height if area, rt, and plates are present
      if (newInj.area && newInj.rt && newInj.plates) {
        const expectedHeight = Math.round(peakHeight(newInj.area, newInj.rt, newInj.plates));
        newInj.height = expectedHeight;
        // Regenerate the trace to perfectly match the parameters
        newInj._trace = generatePeakTrace(newInj.rt, expectedHeight, 0, newInj.tailing || 1.0);
      }
      
      // Auto-calculate RRT
      if (newInj.rt && refRt) {
        newInj.rrt = calculateRRT(newInj.rt, refRt, newInj.area);
      }
      
      // Default areaPct to 100 for single main peak
      newInj.areaPct = 100.00;
    }
    
    return newInj;
  });

  return { ...group, injections: updatedInjections };
}`;

code = code.replace(/export function autoFillGroup\(group: GroupData\) \{\s*return group;\s*\}/g, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
NODE_SCRIPT
node rewrite-autofill.cjs
