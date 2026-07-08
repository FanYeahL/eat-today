"use client";

import { useState } from "react";
import WheelPicker from "@/components/common/WheelPicker";
import { provinceNames, citiesOf } from "@/config/regions";

type CityPickerProps = {
  /** 点确定后回调选中的城市名 */
  onConfirm: (city: string) => void;
};

/**
 * 省市两级滚轮选择器
 * 左轮选省，右轮联动该省城市；选省自动把城市重置为该省第一个。
 * 点「就这儿」把当前城市回调出去。
 */
export default function CityPicker({ onConfirm }: CityPickerProps) {
  const [province, setProvince] = useState(provinceNames[0]);
  const [cities, setCities] = useState(citiesOf(provinceNames[0]));
  const [city, setCity] = useState(citiesOf(provinceNames[0])[0]);

  const handleProvinceChange = (p: string) => {
    setProvince(p);
    const next = citiesOf(p);
    setCities(next);
    setCity(next[0]); // 省变了，城市重置为该省第一个
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-surface/70 p-3">
      <p className="text-xs text-ink-muted/80">滚动选择你所在的城市：</p>

      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <WheelPicker
            options={provinceNames}
            value={province}
            onChange={handleProvinceChange}
            label="选择省份"
          />
        </div>
        <div className="flex-1">
          <WheelPicker
            options={cities}
            value={city}
            onChange={setCity}
            label="选择城市"
          />
        </div>
      </div>

      <button
        onClick={() => onConfirm(city)}
        className="rounded-lg bg-gradient-to-r from-accent-hot to-brand px-4 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-[0_4px_14px_rgb(var(--c-accent-hot)_/_0.18)]"
      >
        就吃 {province}·{city} 附近的
      </button>
    </div>
  );
}
