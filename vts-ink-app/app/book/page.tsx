import type { Metadata } from "next";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = { title: "Book Your Session" };

export default function BookPage() {
  return (
    <>
      <header className="page-head">
        <h1>Book With Ben</h1>
        <p>
          Fill this out start to finish: your info, your idea, the days that work for you, and the release form. Ben reviews
          every request personally and will reach out to confirm your date and deposit. Please allow up to a week for a reply.
        </p>
      </header>
      <BookingFlow />
    </>
  );
}
