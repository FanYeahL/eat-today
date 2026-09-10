/**
 * WGS-84 → GCJ-02，改编自 wandergis/coordtransform 的 wgs84togcj02 公式。
 * 来源：https://github.com/wandergis/coordtransform/blob/606c6f3b57b6f1d60458793fea39928d2b11b637/index.js
 * Copyright (c) 2015 记忆的残骸 (MIT)，完整许可见 docs/licenses/coordtransform.txt。
 * 使用公开近似模型，不承诺测绘精度。边界采用常见的粗略包围盒，
 * 仅保证盒外不偏移；盒内含部分境外地区，不能用作精确国界判断。
 */
import type { Coords } from "./geo";

const A = 6378245.0;
const EE = 0.00669342162296594323;
const PI = Math.PI;

/** 粗略包围盒外直通；并非精确的大陆适用区域判断。 */
export function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let result =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  result += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  result += ((20 * Math.sin(y * PI) + 40 * Math.sin((y * PI) / 3)) * 2) / 3;
  result +=
    ((160 * Math.sin((y * PI) / 12) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return result;
}

function transformLng(x: number, y: number): number {
  let result =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  result += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  result += ((20 * Math.sin(x * PI) + 40 * Math.sin((x * PI) / 3)) * 2) / 3;
  result +=
    ((150 * Math.sin((x * PI) / 12) + 300 * Math.sin((x * PI) / 30)) * 2) / 3;
  return result;
}

export function wgs84ToGcj02(lng: number, lat: number): Coords {
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    Math.abs(lng) > 180 ||
    Math.abs(lat) > 90
  ) {
    throw new RangeError("Invalid WGS-84 coordinates");
  }
  if (outOfChina(lng, lat)) return { lng, lat };
  const radLat = (lat * PI) / 180;
  const magic = 1 - EE * Math.sin(radLat) ** 2;
  const sqrtMagic = Math.sqrt(magic);
  return {
    lng:
      lng +
      (transformLng(lng - 105, lat - 35) * 180) /
        ((A / sqrtMagic) * Math.cos(radLat) * PI),
    lat:
      lat +
      (transformLat(lng - 105, lat - 35) * 180) /
        (((A * (1 - EE)) / (magic * sqrtMagic)) * PI),
  };
}
