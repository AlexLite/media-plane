/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// plane types
import { useTranslation } from "@plane/i18n";
import type { IUser } from "@plane/types";
// plane ui
// hooks
import { useCurrentTime } from "@/hooks/use-current-time";

export interface IUserGreetingsView {
  user: IUser;
}

const RU_WEEKDAY_FALLBACK: Record<string, string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
  sunday: "Воскресенье",
};

const RU_MONTH_FALLBACK: Record<string, string> = {
  jan: "янв.",
  feb: "февр.",
  mar: "мар.",
  apr: "апр.",
  may: "мая",
  jun: "июн.",
  jul: "июл.",
  aug: "авг.",
  sep: "сент.",
  oct: "окт.",
  nov: "нояб.",
  dec: "дек.",
};

export function UserGreetingsView(props: IUserGreetingsView) {
  const { user } = props;
  // current time hook
  const { currentTime } = useCurrentTime();
  // store hooks
  const { t } = useTranslation();

  const locale = "ru-RU";
  const timeZone = user?.user_timezone;

  const hourParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
  }).formatToParts(currentTime);
  const hour = hourParts.find((part) => part.type === "hour")?.value ?? "00";

  const dateParts = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "long",
    month: "short",
    day: "2-digit",
  }).formatToParts(currentTime);
  const day = dateParts.find((part) => part.type === "day")?.value ?? "";
  const weekDayRaw = dateParts.find((part) => part.type === "weekday")?.value ?? "";
  const monthRaw = dateParts.find((part) => part.type === "month")?.value ?? "";
  const weekDayKey = weekDayRaw.toLowerCase().replace(".", "");
  const monthKey = monthRaw.toLowerCase().replace(".", "");
  const weekDay = RU_WEEKDAY_FALLBACK[weekDayKey] ?? weekDayRaw;
  const month = RU_MONTH_FALLBACK[monthKey] ?? monthRaw;
  const date = `${day} ${month}`.trim();

  const timeString = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(currentTime);

  const greeting = parseInt(hour, 10) < 12 ? "morning" : parseInt(hour, 10) < 18 ? "afternoon" : "evening";

  return (
    <div className="my-6 flex flex-col items-center">
      <h2 className="text-center text-20 font-semibold">
        {t("good")} {t(greeting)}, {user?.first_name} {user?.last_name}
      </h2>
      <h5 className="flex items-center gap-2 font-medium text-placeholder">
        <div>{greeting === "morning" ? "🌤️" : greeting === "afternoon" ? "🌥️" : "🌙️"}</div>
        <div>
          {weekDay}, {date} {timeString}
        </div>
      </h5>
    </div>
  );
}
