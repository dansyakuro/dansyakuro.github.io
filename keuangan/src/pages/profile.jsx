import React from "react";
import { useParams } from "react-router-dom";

export default function Profile() {
  const { id } = useParams();

  return (
    <div>
      <h2>Buku Kas</h2>
      <p>ID Profile: {id}</p>
    </div>
  );
}
