import { cn } from "@/lib/utils/cn";

interface WanderingSpeechBubbleProps {
  className?: string;
}

/**
 * Hey Ralli speech-bubble character matching the approved mockup.
 * Static walk-right pose (toes →); whole figure translates off-page.
 */
export function WanderingSpeechBubble({ className }: WanderingSpeechBubbleProps) {
  return (
    <div
      className={cn(
        "hr-wander relative mx-auto h-[min(52vh,22rem)] w-full max-w-lg select-none sm:h-[min(56vh,26rem)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 480 360"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        focusable="false"
      >
        <path
          className="hr-wander-trail"
          d="M40 300
             C 70 300, 78 270, 95 270
             C 112 270, 118 300, 145 300
             C 200 300, 240 286, 290 292
             C 340 298, 390 288, 460 290"
          fill="none"
          stroke="var(--cos-border)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1.5 11"
        />
      </svg>

      <div className="hr-wander-stage absolute inset-0 flex items-end justify-center pb-2">
        <svg
          viewBox="0 0 280 300"
          className="hr-wander-walker h-[85%] w-auto overflow-visible"
          role="img"
          focusable="false"
        >
          <title>Hey Ralli speech bubble walking away with a map</title>

          <g className="hr-wander-bob">
            {/* Brand rays */}
            <g>
              <rect
                x="188"
                y="18"
                width="11"
                height="32"
                rx="5.5"
                fill="var(--cos-brand-mustard)"
                transform="rotate(-32 193.5 34)"
              />
              <rect
                x="210"
                y="8"
                width="11"
                height="34"
                rx="5.5"
                fill="var(--cos-brand-sage)"
                transform="rotate(-6 215.5 25)"
              />
              <rect
                x="232"
                y="16"
                width="11"
                height="32"
                rx="5.5"
                fill="var(--cos-brand-terracotta)"
                transform="rotate(22 237.5 32)"
              />
            </g>

            <path
              d="M48 48 h150 a26 26 0 0 1 26 26 v96 a26 26 0 0 1 -26 26 h-72 l-32 34 -8 -34 h-38 a26 26 0 0 1 -26 -26 v-96 a26 26 0 0 1 26 -26 z"
              fill="var(--cos-card)"
              stroke="#18243b"
              strokeWidth="5"
              strokeLinejoin="round"
            />

            <text
              x="123"
              y="118"
              textAnchor="middle"
              fill="#18243b"
              style={{
                fontFamily:
                  "var(--font-cormorant), Georgia, 'Times New Roman', serif",
                fontSize: "52px",
                fontWeight: 600,
              }}
            >
              Hey
            </text>

            <circle cx="108" cy="148" r="3.4" fill="#18243b" />
            <circle cx="138" cy="148" r="3.4" fill="#18243b" />
            <path
              d="M112 164 q13 11 26 0"
              fill="none"
              stroke="#18243b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Trailing arm */}
            <path
              d="M74 196 q-6 20 6 38"
              fill="none"
              stroke="#18243b"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/*
              Map held UP (mockup): arm to a round hand UNDER the map;
              map rests on the palm; tiny fingers curl up over the bottom edge.
            */}
            <path
              d="M166 198 L 206 190"
              fill="none"
              stroke="#18243b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* map */}
            <rect
              x="196"
              y="124"
              width="40"
              height="56"
              rx="2"
              fill="#fffcf7"
              stroke="#18243b"
              strokeWidth="2"
            />
            <path
              d="M209 124 v56 M223 124 v56"
              stroke="#ddd4c8"
              strokeWidth="1.5"
            />
            <path
              d="M204 138 q7 5 11 -2 q5 8 13 2"
              fill="none"
              stroke="#b8956f"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2 2.5"
            />
            <path
              d="M222 158 l4 4 m0 -4 l-4 4"
              stroke="#d06650"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Palm under map (center-bottom). Fingers curl UP onto map. */}
            <ellipse
              cx="216"
              cy="184"
              rx="9"
              ry="7"
              fill="#fffcf7"
              stroke="#18243b"
              strokeWidth="2.5"
            />
            <path
              d="M208 178 Q 216 170 224 178"
              fill="none"
              stroke="#18243b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/*
              Walk cycle → right. Feet counter-rotate so toes stay pointing →.
            */}
            <g className="hr-wander-leg-back">
              <path
                d="M124 228 L 116 280"
                fill="none"
                stroke="#18243b"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <g className="hr-wander-foot-back">
                <path
                  d="M116 280 L 138 280"
                  fill="none"
                  stroke="#18243b"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            </g>

            <g className="hr-wander-leg-front">
              <path
                d="M158 228 L 170 254 L 180 280"
                fill="none"
                stroke="#18243b"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g className="hr-wander-foot-front">
                <path
                  d="M180 280 L 204 280"
                  fill="none"
                  stroke="#18243b"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
