import React from "react";

// Toolbar icons shared by every Management page (same set as the Products toolbar).
export const DR_ICONS={
 refresh:"M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
 add:"M12 5v14M5 12h14",
 edit:"M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
 delete:"M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3",
 print:"M7 9V3h10v6M6 18H4v-7h16v7h-2M7 14h10v7H7z",
 pdf:"M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h4",
 export:"M12 15V3M7 8l5-5 5 5M4 21h16",
 import:"M12 3v12M7 10l5 5 5-5M4 21h16",
 help:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01",
 history:"M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
 count:"M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
 quick:"M13 2 4 14h7l-1 8 9-12h-7z",
 convert:"M4 7h13l-3-3M20 17H7l3 3",
 back:"M15 18l-6-6 6-6"
};

// Products-style toolbar button: icon above label, borderless.
export function DrTool({icon,label,danger,className="",...props}){
 return <button type="button" className={"dr-tool"+(danger?" danger":"")+(className?" "+className:"")} title={label} {...props}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={DR_ICONS[icon]||DR_ICONS.add}/></svg><span>{label}</span></button>;
}
