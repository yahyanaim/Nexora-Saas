"use client"

import { cn } from "@/lib/utils"

interface CitySkylineProps {
  className?: string
}

/**
 * Handcrafted architectural city skyline engraving illustration.
 * Features classic Art Deco skyscrapers, tiered towers, spires,
 * historic facades, and tree foliage with vintage etching linework.
 */
export function CitySkyline({ className }: CitySkylineProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative w-full max-w-2xl mx-auto overflow-hidden select-none flex items-end justify-center",
        className
      )}
    >
      <svg
        viewBox="0 0 1000 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto text-neutral-800 dark:text-neutral-300 opacity-90 transition-opacity"
      >
        <defs>
          {/* Subtle top & edge fade mask */}
          <linearGradient id="skyline-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="25%" stopColor="white" stopOpacity="0.4" />
            <stop offset="70%" stopColor="white" stopOpacity="0.95" />
            <stop offset="100%" stopColor="white" stopOpacity="1" />
          </linearGradient>

          {/* Mask applied to overall group */}
          <mask id="skyline-mask">
            <rect width="1000" height="360" fill="url(#skyline-fade)" />
          </mask>
        </defs>

        <g mask="url(#skyline-mask)" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* ============================================================ */}
          {/* BACKGROUND SILHOUETTE BUILDINGS (Distant Layer) */}
          {/* ============================================================ */}
          <g strokeWidth="0.6" strokeOpacity="0.4">
            {/* Far Left Building */}
            <path d="M120 320 V160 H170 V320" />
            <path d="M125 160 V320 M135 160 V320 M145 160 V320 M155 160 V320 M165 160 V320" strokeDasharray="2 3" />

            {/* Distant Spire 1 */}
            <path d="M240 320 V120 H280 V320" />
            <path d="M260 120 V70 M258 70 H262 M260 70 L260 50" />
            <line x1="245" y1="130" x2="275" y2="130" />
            <line x1="245" y1="150" x2="275" y2="150" />
            <line x1="245" y1="170" x2="275" y2="170" />

            {/* Center Background High-Rise */}
            <path d="M460 320 V60 H540 V320" />
            <path d="M480 60 V35 H520 V60" />
            <path d="M495 35 V15 H505 V35" />
            <line x1="500" y1="15" x2="500" y2="0" strokeWidth="1" />
            <path d="M470 70 H530 M470 90 H530 M470 110 H530 M470 130 H530 M470 150 H530" strokeDasharray="3 3" />

            {/* Distant Spire 2 */}
            <path d="M720 320 V140 H760 V320" />
            <path d="M740 140 V90 M738 90 H742" />

            {/* Far Right Tower */}
            <path d="M830 320 V150 H880 V320" />
            <path d="M840 150 V320 M850 150 V320 M860 150 V320 M870 150 V320" strokeDasharray="2 3" />
          </g>

          {/* ============================================================ */}
          {/* MIDGROUND BUILDINGS (Art Deco & Neoclassical Towers) */}
          {/* ============================================================ */}
          <g strokeWidth="0.9" strokeOpacity="0.75">
            {/* Left Tower 1 - Stepped High-Rise (320 -> 110) */}
            <path d="M180 340 V150 H200 V130 H225 V110 H235 V130 H260 V150 H270 V340" />
            {/* Vertical Ribs & Windows */}
            <line x1="205" y1="130" x2="205" y2="340" strokeWidth="0.6" />
            <line x1="215" y1="110" x2="215" y2="340" strokeWidth="0.6" />
            <line x1="225" y1="110" x2="225" y2="340" strokeWidth="0.6" />
            <line x1="235" y1="110" x2="235" y2="340" strokeWidth="0.6" />
            <line x1="245" y1="130" x2="245" y2="340" strokeWidth="0.6" />
            {/* Horizontal Fenestration Hatching */}
            <line x1="185" y1="165" x2="265" y2="165" strokeDasharray="2 2" />
            <line x1="185" y1="185" x2="265" y2="185" strokeDasharray="2 2" />
            <line x1="185" y1="205" x2="265" y2="205" strokeDasharray="2 2" />
            <line x1="185" y1="225" x2="265" y2="225" strokeDasharray="2 2" />
            <line x1="185" y1="245" x2="265" y2="245" strokeDasharray="2 2" />
            <line x1="185" y1="265" x2="265" y2="265" strokeDasharray="2 2" />

            {/* Left-Center Tiered Tower (310 -> 80) */}
            <path d="M290 340 V180 H305 V140 H320 V100 H335 V80 H355 V100 H370 V140 H385 V180 H395 V340" />
            <line x1="345" y1="80" x2="345" y2="50" strokeWidth="1" />
            <line x1="310" y1="100" x2="380" y2="100" />
            <line x1="300" y1="140" x2="390" y2="140" />
            <line x1="295" y1="180" x2="395" y2="180" />
            {/* Windows Hatching */}
            <g strokeDasharray="2 2" strokeWidth="0.5">
              <line x1="325" y1="110" x2="365" y2="110" />
              <line x1="325" y1="120" x2="365" y2="120" />
              <line x1="325" y1="130" x2="365" y2="130" />
              <line x1="310" y1="150" x2="380" y2="150" />
              <line x1="310" y1="160" x2="380" y2="160" />
              <line x1="310" y1="170" x2="380" y2="170" />
              <line x1="300" y1="190" x2="390" y2="190" />
              <line x1="300" y1="205" x2="390" y2="205" />
              <line x1="300" y1="220" x2="390" y2="220" />
              <line x1="300" y1="235" x2="390" y2="235" />
            </g>

            {/* Iconic Central Spire Tower (Chrysler / Empire Style) */}
            <path d="M475 340 V120 H490 V85 H505 V50 H515 V30 H525 V50 H535 V85 H550 V120 H565 V340" />
            {/* Spire Pin */}
            <path d="M520 30 V2" strokeWidth="1.2" />
            <path d="M518 8 H522 M517 14 H523" />
            {/* Triangular Art Deco Crown Facet Details */}
            <path d="M505 50 L520 30 L535 50" />
            <path d="M490 85 L520 50 L550 85" />
            <path d="M475 120 L520 85 L565 120" />
            {/* Vertical Fluting on Central Tower */}
            <line x1="500" y1="120" x2="500" y2="340" strokeWidth="0.7" />
            <line x1="510" y1="85" x2="510" y2="340" strokeWidth="0.7" />
            <line x1="520" y1="50" x2="520" y2="340" strokeWidth="0.8" />
            <line x1="530" y1="85" x2="530" y2="340" strokeWidth="0.7" />
            <line x1="540" y1="120" x2="540" y2="340" strokeWidth="0.7" />
            {/* Decorative Arched Windows */}
            <g strokeWidth="0.5">
              <rect x="502" y="130" width="8" height="12" rx="4" />
              <rect x="516" y="130" width="8" height="12" rx="4" />
              <rect x="530" y="130" width="8" height="12" rx="4" />
              <rect x="502" y="150" width="8" height="12" rx="4" />
              <rect x="516" y="150" width="8" height="12" rx="4" />
              <rect x="530" y="150" width="8" height="12" rx="4" />
              <rect x="502" y="170" width="8" height="12" rx="4" />
              <rect x="516" y="170" width="8" height="12" rx="4" />
              <rect x="530" y="170" width="8" height="12" rx="4" />
            </g>

            {/* Right Tower with Water Tank & Colonettes */}
            <path d="M600 340 V160 H625 V130 H645 V105 H670 V130 H685 V160 H710 V340" />
            {/* Water Tank */}
            <path d="M650 105 V85 H665 V105 Z" fill="currentColor" fillOpacity="0.1" />
            <line x1="648" y1="105" x2="667" y2="105" strokeWidth="1" />
            <path d="M650 85 L657 78 L665 85" strokeWidth="0.8" />
            <line x1="657" y1="78" x2="657" y2="70" />
            {/* Grid Windows */}
            <line x1="610" y1="160" x2="610" y2="340" strokeWidth="0.6" />
            <line x1="630" y1="130" x2="630" y2="340" strokeWidth="0.6" />
            <line x1="655" y1="105" x2="655" y2="340" strokeWidth="0.6" />
            <line x1="675" y1="130" x2="675" y2="340" strokeWidth="0.6" />
            <line x1="695" y1="160" x2="695" y2="340" strokeWidth="0.6" />
            <line x1="605" y1="175" x2="705" y2="175" strokeDasharray="2 2" strokeWidth="0.5" />
            <line x1="605" y1="195" x2="705" y2="195" strokeDasharray="2 2" strokeWidth="0.5" />
            <line x1="605" y1="215" x2="705" y2="215" strokeDasharray="2 2" strokeWidth="0.5" />

            {/* Flatiron-Style Angled Building (Right) */}
            <path d="M750 340 V170 L780 140 H805 V340" />
            <line x1="780" y1="140" x2="780" y2="340" strokeWidth="0.7" />
            <line x1="760" y1="170" x2="760" y2="340" strokeWidth="0.6" strokeDasharray="3 2" />
            <line x1="795" y1="150" x2="795" y2="340" strokeWidth="0.6" strokeDasharray="3 2" />
          </g>

          {/* ============================================================ */}
          {/* FOREGROUND CLASSIC FACADES (Brownstones & Detailed Buildings) */}
          {/* ============================================================ */}
          <g strokeWidth="1" strokeOpacity="0.9">
            {/* Left Foreground Classical Bank/Library Facade */}
            <path d="M215 350 V200 H280 V350" />
            <path d="M210 200 H285" strokeWidth="1.5" />
            <path d="M215 208 H280" strokeWidth="0.7" />
            {/* Columns & Window Rows */}
            <g strokeWidth="0.6">
              <rect x="225" y="215" width="8" height="14" rx="2" />
              <rect x="240" y="215" width="8" height="14" rx="2" />
              <rect x="255" y="215" width="8" height="14" rx="2" />
              <rect x="270" y="215" width="8" height="14" rx="2" />
              <rect x="225" y="240" width="8" height="14" rx="2" />
              <rect x="240" y="240" width="8" height="14" rx="2" />
              <rect x="255" y="240" width="8" height="14" rx="2" />
              <rect x="270" y="240" width="8" height="14" rx="2" />
            </g>

            {/* Center-Left Detailed Palazzo (350 -> 180) */}
            <path d="M370 350 V190 H445 V350" />
            <path d="M365 190 H450" strokeWidth="1.5" />
            {/* Balustrade / Roof Cornice */}
            <path d="M368 184 H447 V190 H368 Z" fill="currentColor" fillOpacity="0.05" />
            <line x1="368" y1="184" x2="447" y2="184" strokeWidth="0.8" />
            {/* Detailed Arched Windows with Pediments */}
            <g strokeWidth="0.6">
              <path d="M380 205 L386 200 L392 205 V220 H380 Z" />
              <path d="M400 205 L406 200 L412 205 V220 H400 Z" />
              <path d="M420 205 L426 200 L432 205 V220 H420 Z" />

              <rect x="380" y="232" width="12" height="16" />
              <line x1="386" y1="232" x2="386" y2="248" />
              <line x1="380" y1="240" x2="392" y2="240" />

              <rect x="400" y="232" width="12" height="16" />
              <line x1="406" y1="232" x2="406" y2="248" />
              <line x1="400" y1="240" x2="412" y2="240" />

              <rect x="420" y="232" width="12" height="16" />
              <line x1="426" y1="232" x2="426" y2="248" />
              <line x1="420" y1="240" x2="432" y2="240" />
            </g>

            {/* Center-Right Historic Commercial Building (Water Tower / Roof Stairs) */}
            <path d="M545 350 V180 H625 V350" />
            <path d="M540 180 H630" strokeWidth="1.6" />
            {/* Roof Top Entryway / Penthouse */}
            <path d="M555 180 V162 H575 V180" />
            <line x1="558" y1="168" x2="572" y2="168" strokeWidth="0.6" />
            {/* Water Tank on Stilts */}
            <path d="M585 180 L590 165 M605 180 L600 165" strokeWidth="0.8" />
            <rect x="586" y="148" width="18" height="17" rx="1" fill="currentColor" fillOpacity="0.08" />
            <line x1="586" y1="154" x2="604" y2="154" strokeWidth="0.5" />
            <line x1="586" y1="160" x2="604" y2="160" strokeWidth="0.5" />
            <path d="M586 148 L595 140 L604 148" strokeWidth="0.8" />
            {/* Multi-story Classic Grid Facade */}
            <g strokeWidth="0.6">
              <rect x="555" y="195" width="10" height="13" />
              <rect x="572" y="195" width="10" height="13" />
              <rect x="589" y="195" width="10" height="13" />
              <rect x="606" y="195" width="10" height="13" />

              <rect x="555" y="218" width="10" height="13" />
              <rect x="572" y="218" width="10" height="13" />
              <rect x="589" y="218" width="10" height="13" />
              <rect x="606" y="218" width="10" height="13" />

              <rect x="555" y="240" width="10" height="13" />
              <rect x="572" y="240" width="10" height="13" />
              <rect x="589" y="240" width="10" height="13" />
              <rect x="606" y="240" width="10" height="13" />
            </g>
          </g>

          {/* ============================================================ */}
          {/* LUSH TREE CANOPY & PARK FOLIAGE (Grounding Foreground) */}
          {/* ============================================================ */}
          <g strokeWidth="0.7" strokeOpacity="0.85" fill="currentColor" fillOpacity="0.05">
            {/* Left Trees Cluster */}
            <path d="M120 350 C125 330, 140 315, 160 315 C175 315, 185 325, 190 315 C195 305, 210 300, 225 305 C235 308, 240 315, 245 320 C255 310, 270 310, 280 320 C290 330, 295 345, 295 350 Z" />
            {/* Center Trees Cluster */}
            <path d="M340 350 C345 335, 360 320, 380 320 C395 320, 405 328, 415 318 C425 308, 445 305, 460 315 C475 310, 495 308, 510 318 C525 308, 545 310, 555 322 C565 315, 580 318, 590 328 C600 338, 605 350, 605 350 Z" />
            {/* Right Trees Cluster */}
            <path d="M680 350 C685 330, 700 315, 720 315 C735 315, 745 325, 755 318 C770 308, 790 310, 805 322 C815 330, 825 345, 825 350 Z" />

            {/* Etching Hatching Texture in Foliage */}
            <g strokeWidth="0.4" strokeDasharray="1 2">
              <path d="M140 325 C145 335, 155 340, 165 345" />
              <path d="M175 325 C180 335, 190 340, 200 345" />
              <path d="M210 320 C215 330, 225 340, 235 345" />
              <path d="M360 330 C370 340, 380 345, 390 350" />
              <path d="M430 325 C440 335, 450 340, 460 350" />
              <path d="M480 325 C490 335, 500 340, 510 350" />
              <path d="M530 325 C540 335, 550 340, 560 350" />
              <path d="M700 330 C710 340, 720 345, 730 350" />
              <path d="M750 325 C760 335, 770 340, 780 350" />
            </g>
          </g>

          {/* Ground Base Line */}
          <line x1="80" y1="350" x2="920" y2="350" strokeWidth="1" strokeOpacity="0.4" />
        </g>
      </svg>
    </div>
  )
}
