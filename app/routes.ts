import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("history", "routes/history.tsx"),
    route("officers", "routes/officers.tsx"),
    route("committees", "routes/committees.tsx"),
    route("past-masters", "routes/pastMasters.tsx"),
    route("events", "routes/events.tsx"),
    route("contact", "routes/contact.tsx"),
    route("login", "routes/login.tsx"),
] satisfies RouteConfig;
