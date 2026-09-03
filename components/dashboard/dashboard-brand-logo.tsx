"use client";

import Image from "next/image";
import { useState } from "react";

export function DashboardBrandLogo() {
  const [cacheBuster] = useState(() => Date.now().toString());

  return (
    <div className="mx-auto flex justify-center">
      <span className="block dark:hidden">
        <Image
          src="/masar-logo.png"
          alt="مسار"
          width={220}
          height={198}
          priority
          className="h-24 w-auto object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105 sm:h-28"
        />
      </span>

      <span className="hidden dark:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/branding/dark-logo?v=${cacheBuster}`}
          alt="مسار - الوضع الداكن"
          className="h-24 w-auto max-w-[220px] object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105 sm:h-28"
        />
      </span>
    </div>
  );
}
