import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET is not set");
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err: any) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  const { id } = event.data;
  const eventType = event.type;

  if (eventType === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = event.data;
      console.log("Event data:", event.data);

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      if (!primaryEmail) {
        return new Response("No primary email found", { status: 400 });
      }

      // Create a new user in the database

      const newUser = await prisma.user.create({
        data: {
          id: event.data.id!,
          email: primaryEmail.email_address,
          isSubscribed: false,
        },
      });
      console.log("New user created:", newUser);
    } catch (error) {
      console.error("Error creating user in database:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }

  return new Response("User created", { status: 200 });
}
