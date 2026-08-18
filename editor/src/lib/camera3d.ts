const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const PREVIEW_CAMERA_MARGIN = 1.1;
export const PREVIEW_MIN_DISTANCE = 4.6;

/** Minimum target distance that keeps a sphere inside a perspective viewport. */
export function fitSphereDistance(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
  margin = 1.1,
): number {
  const safeRadius = Math.max(0, radius);
  const safeAspect = Math.max(1e-4, aspect);
  const verticalHalfFov = degreesToRadians(verticalFovDegrees) / 2;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * safeAspect);
  const limitingHalfFov = Math.max(1e-4, Math.min(verticalHalfFov, horizontalHalfFov));
  return (safeRadius / Math.sin(limitingHalfFov)) * Math.max(1, margin);
}

export function fitPreviewCameraDistance(
  radius: number,
  verticalFovDegrees: number,
  aspect: number,
): number {
  return Math.max(
    PREVIEW_MIN_DISTANCE,
    fitSphereDistance(radius, verticalFovDegrees, aspect, PREVIEW_CAMERA_MARGIN),
  );
}
