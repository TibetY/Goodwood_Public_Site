import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("history", "routes/about/history.tsx"),
    route("officers", "routes/about/officers.tsx"),
    route("committees", "routes/about/committees.tsx"),
    route("past-masters", "routes/about/pastMasters.tsx"),
    route("events", "routes/events.tsx"),
    route("contact", "routes/contact.tsx"),
    route("login", "routes/login.tsx"),
    route("set-password", "routes/setPassword.tsx"),
    route("portal", "routes/portal/portal.tsx"),
    route("portal/members", "routes/portal/manageMembers.tsx"),
    route("portal/committees", "routes/portal/manageCommittees.tsx"),
    route("portal/officers", "routes/portal/manageOfficers.tsx"),
    // route("portal/degree-work", "routes/portal/degreeWork.tsx"),
    // route("portal/events", "routes/portal/manageEvents.tsx"),
    // route("portal/dues", "routes/portal/payDues.tsx"),
] satisfies RouteConfig;
