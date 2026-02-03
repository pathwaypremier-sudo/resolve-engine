import Section from "@/components/Section";
import { links } from "@/lib/links";

export default function Footer() {
    return (
        <Section className="py-10">
            <div className="flex flex-col gap-4 border-t border-slate-200 pt-8 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-600">© {new Date().getFullYear()} Resolve Engine</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <a className="text-slate-600 hover:text-slate-900" href={links.privacy}>
                        Privacy
                    </a>
                    <a className="text-slate-600 hover:text-slate-900" href={links.terms}>
                        Terms
                    </a>
                    <a className="text-slate-600 hover:text-slate-900" href={links.contact}>
                        Contact
                    </a>
                </div>
            </div>
        </Section>
    );
}
