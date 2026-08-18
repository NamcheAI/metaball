const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const PREVIEW_CAMERA_MARGIN = 1.1;
export const PREVIEW_MIN_DISTANCE = 4.6;

export function fitSphereDistance(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
  margin = PREVIEW_CAMERA_MARGIN,
): number {
  const verticalHalfFov = toRadians(verticalFovDegrees) / 2;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(1e-4, aspect));
  const limitingHalfFov = Math.max(1e-4, Math.min(verticalHalfFov, horizontalHalfFov));
  return (Math.max(0, radius) / Math.sin(limitingHalfFov)) * Math.max(1, margin);
}

export function fitPreviewCameraDistance(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
): number {
  return Math.max(PREVIEW_MIN_DISTANCE, fitSphereDistance(radius, verticalFovDegrees, aspect));
}
