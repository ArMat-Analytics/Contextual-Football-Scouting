export const TOOLTIP_DESCRIPTIONS: Record<string, string> = {
  // Main indices
  'Progression': 'How much the player moves the ball forward through opposing pressure. 0–100 percentile within his role: 80 means top-20% progressor among players of his role.',
  'Dangerousness': 'Total offensive value the player generates in possession. 0–100 percentile within his role: 83 means top-17% threat creator among players of his role.',
  'Reception': 'How well the player operates between the opposing lines: positioning to receive, exiting the block, holding up under pressure. 0–100 percentile within his role.',
  'Gravity': 'How much the player bends the opposing defence around him when he has the ball. 0–100 percentile within his role.',
  'Decision Quality': 'How good the player\'s passing decisions are, graded against the options he had available. A 0 to 100 percentile within his role: 100 is the best decision maker of the role, 50 the median.',

  // Progression Axes & Stats
  'LB Geom /90': 'Geometric line-breakers per 90 minutes. Who breaks through opposing pressure most often per unit of time.',
  'LB Quality /90': 'Quality line-breakers per 90 minutes. The most selective progression metric.',
  'High Value Pass /90': 'Lorem minuscolo...',
  'Hull Penetr. /90': 'Lorem minuscolo...',
  'Def. Bypassed Avg': 'Lorem minuscolo...',
  'LB Geom': 'Count of passes that physically broke through the opposing pressure, bypassing 3+ opponents inside a 5 m corridor around the pass line.',
  'LB Quality': 'Count of line-breakers that are both geometrically bold (3+ opponents bypassed) and of above-average EPV value for the role.',
  'High Value Pass': 'Count of successful passes that noticeably increase the danger of the possession, switches, through-balls, releases into space.',
  'Def. Bypassed (avg)': 'Average number of opponents the player leaves behind per pass. High = a player who plays vertically into pressure rather than recycling in clear zones.',
  'Penetration Attempts (n)': 'How many times the player tried to play the ball from outside the opposing block to inside it. Pure volume of the gesture, successes and failures alike.',
  'Successful Penetrations (n)': 'How many penetration attempts actually landed inside the opposing block. They are balls that physically crossed into the shape and were received.',
  'Penetration Attempts /90': 'How often per 90 minutes the player tries to break through the opposing block, regardless of outcome. A signal of verticalising ambition.',
  'Successful Penetrations /90': 'Successful block penetrations per 90 minutes. It is the per-90 version of the radar axis Hull Penetr. /90.',
  'LB Geom %': 'Share of the player’s open play passes that are geometric line-breakers. A verticality marker.',
  'LB Quality %': 'Share of the player’s open play passes that are quality line-breakers (bold and valuable).',
  'High Value Pass %': 'Lorem minuscolo...',
  'Penetration Completion %': 'When the player tries to break through the block, how often he succeeds. Pure execution quality, separated from how often he tries.',

  // Dangerousness Axes & Stats
  'EPV Added /90': 'Total offensive value generated per 90 minutes. The Dangerousness index is the within-role percentile of exactly this number.',
  'EPV Penetr. /90': 'Per-90 rate at which the player generates value with passes that physically enter the opposing block (out→in).',
  'Circ. EPV /90': 'Lorem minuscolo...',
  'EPV Added (sum)': 'Lorem minuscolo...',
  'EPV Penetr. (sum)': 'Total value generated with passes that physically penetrate the opposing block (out→in).',
  'Circ. EPV (sum)': 'Lorem minuscolo...',
  'Inside Circ. (n)': 'How many passes started and ended inside the opposing block (in→in). Context for the Reception radar, not part of the Reception index.',
  'Inside Circ. /90': 'In→in passes per 90 minutes (all passes, not a success rate). Volume context for the Reception radar, not part of the Reception index.',

  // Reception Axes & Stats
  'Between Lines %': 'Share of the player’s open play passes received between the opposing lines. The mother stat behind the Reception radar axis of the same name.',
  'Hull Exits /90': 'Successful exits from between the lines per 90 minutes. It is the per-90 mother stat behind the Reception radar axis of the same name.',
  'Press. Resist %': 'When 2+ opponents are on the player, how often he still completes the pass. The mother stat behind the Reception radar axis of the same name.',
  'Block Receipts (n)': 'How many times the player received a ball while positioned between the opposing lines, a proxy for off-the-ball intelligence.',
  'Press. Resist (n)': 'How many times the player played a ball with 2+ opponents within 2.5 m of him, the volume on which his composure under pressure is measured.',
  'Between Lines /90': 'How often per 90 minutes the player checks into a position between the opposing lines to receive. Frequency, not outcome.',
  'Hull Exits %': 'Lorem minuscolo...',

  // Gravity Axes & Stats
  'Space Attraction %': 'How much the defence tightens around the player when he has the ball, vs. how much it would tighten for anyone else in the same zone.',
  'Gravity Hull %': 'How much the area of the opposing block shrinks when the player has the ball, vs. the baseline. The deformation he forces on the defensive shape.',
  'Def. Pull |m|': 'Lorem minuscolo...',
  'Def. Pull (m)': 'How far, in metres, the player shifts the opposing defence. It is the size of the pull he forces on the opponent centroid, regardless of its direction.',

  // Decision Quality Axes & Stats
  'Picks the best %': 'Share of the player\'s passes where he chose the single best option available. Higher is better.',
  'Avoids the worst %': 'Lorem minuscolo...',
  'Elite reads / 90': 'How often every 90 minutes the player makes a top-decile decision for his role. A volume signal of elite reads; higher is better.',
  'Avoids poor / 90': 'Lorem minuscolo...',
  'Score': 'The raw score behind the Decision Quality Index, between 0 and 1. Shown for transparency, so the reader can see what the index is the percentile of.',
  'Score SD': 'How much the player\'s decision quality swings from one pass to the next. It is a consistency reading, not a quality grade.',
  'Avg miss cost': ' When the player does not pick the best option, how much value he leaves on the table on average. Shown in percentage points of scoring probability (the underlying xEPV value is multiplied by 100). It measures how costly a mistake is, not how often it happens.',
};