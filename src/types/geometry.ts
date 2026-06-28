export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

/** A convex quadrilateral defined by 4 corners in order: TL, TR, BR, BL */
export type Quad = [Point, Point, Point, Point];
