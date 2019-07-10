import { Matrix4 } from "three";
import perspective from 'perspective-transform';

export function getPerspectiveTransform(src, dst) {
  // Get the homographic transform matrix, expressed as an array of coefficients.
  const [a1, a2, a3, b1, b2, b3, c1, c2, c3] = perspective(src, dst).coeffs;

  // Create a 4x4 transformation matrix.
  // Transform x and y coordinate, but leave the z coordinates of
  // the homogeneous coordinate vectors alone.
  // Don't use 3x3 because THREE.Mesh is 4x4.
  const transformMatrix = new Matrix4();

  transformMatrix.set(
    a1, a2, 0, a3,
    b1, b2, 0, b3,
    0, 0, 1, 0,
    c1, c2, 0, c3
  );

  return transformMatrix;
}
