import { PageContent } from "@/components/page-content"
import { PageHeader } from "@/components/page-header"
import { ParkingSlotsGrid } from "@/components/parking-slots-grid"

export function CCTVPage() {
    return (
        <PageContent>
            <PageHeader
                title="CCTV"
                description="Live parking slot monitoring"
            />
            <div className="px-6 pt-4 pb-8">
                <ParkingSlotsGrid />
            </div>
        </PageContent>
    )
}
