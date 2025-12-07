"use client";

import PlaceholderPage from "@/components/PlaceholderPage";
import { CalendarIcon } from "@/components/icons/DuotoneIcons";

export default function CalendarPage() {
    return (
        <PlaceholderPage
            title="Calendar"
            icon={<CalendarIcon size={32} />}
            joke="This calendar is still syncing naps, pickups and pizza nights."
            description="Keep track of when June is with each parent, schedule important events, and never miss a pickup or activity."
            features={[
                "See when June is with Daddy, Mommy, or other homes",
                "Track pickup and drop-off times",
                "Add school events, holidays and activities",
                "Get reminders for travel bag packing",
                "See medical or appointment reminders"
            ]}
        />
    );
}
