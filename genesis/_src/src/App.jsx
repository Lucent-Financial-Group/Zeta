import React, { useEffect, useState } from "react";
import Genesis from "./Genesis.jsx";
import AuthWidget from "./AuthWidget.jsx";
import { captureTokenFromUrl } from "./auth.js";

/* Thin wrapper: renders the UNCHANGED Genesis prototype with a sign-in overlay
 * on top. Genesis.jsx is never imported-into or modified. */
export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    captureTokenFromUrl(); // pick up #token=... handed back by the broker
    setReady(true);
  }, []);
  return (
    <>
      <Genesis />
      {ready ? <AuthWidget /> : null}
    </>
  );
}
