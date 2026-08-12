import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    // About Us Section
    route("history", "routes/about/history.tsx"),
    route("officers", "routes/about/officers.tsx"),
    route("committees", "routes/about/committees.tsx"),
    route("past-masters", "routes/about/pastMasters.tsx"),
    
    route("photos", "routes/photos.tsx"),
    route("events", "routes/events.tsx"),
    route("contact", "routes/contact.tsx"),
    route("thank-you", "routes/thankYou.tsx"),
    route("login", "routes/login.tsx"),
    route("set-password", "routes/setPassword.tsx"),

    // Ticketing (public). Deliberately NOT added to STATIC_ROUTES in
    // scripts/prerender.mjs — these are per-event and per-order pages.
    route("events/:slug/tickets", "routes/tickets/buyTickets.tsx"),
    route("tickets/confirmation", "routes/tickets/confirmation.tsx"),
    route("t/:token", "routes/tickets/ticket.tsx"),

    // Portal Section
    route("portal", "routes/portal/portal.tsx"),
    route("portal/members", "routes/portal/manageMembers.tsx"),
    route("portal/committees", "routes/portal/manageCommittees.tsx"),
    route("portal/officers", "routes/portal/manageOfficers.tsx"),
    route("portal/photos", "routes/portal/managePhotos.tsx"),
    route("portal/events", "routes/portal/manageEvents.tsx"),
    route("portal/events/:eventId/orders", "routes/portal/eventOrders.tsx"),
    route("portal/events/:eventId/door", "routes/portal/doorCheckIn.tsx"),
    // route("portal/degree-work", "routes/portal/degreeWork.tsx"),
    // route("portal/dues", "routes/portal/payDues.tsx"),
] satisfies RouteConfig;
