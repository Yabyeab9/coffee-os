import { useEffect } from "react";

export default function PaymentReturn() {
  useEffect(() => {
    window.open("/account/reservations", "_blank");

    document.body.innerHTML = `
      <div style="
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
        font-family:sans-serif;
        text-align:center;
      ">
        <div>
          <h2>Payment Successful</h2>
          <p>Your reservation has been opened in a new tab.</p>
          <p>You may now continue viewing your Chapa receipt.</p>
        </div>
      </div>
    `;
  }, []);

  return null;
}