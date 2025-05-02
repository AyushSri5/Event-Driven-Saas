import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
    const {userId} =await auth();

    if(!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    try {
        const user = await prisma.user.findUnique({where: {id: userId}});

        if(!user) {
            return NextResponse.json({error: "User not found"}, {status: 404});
        }

        const subscriptionEnds = new Date();
        subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);

        const updatedUser = await prisma.user.update({
            where: {id: userId},
            data: {
                isSubscribed: true,
                subscriptionEnds: subscriptionEnds,
            }
        });

        return NextResponse.json(
            {message: "Subscription updated successfully", user: updatedUser},{status:200});
    } catch (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
    }
}

export async function GET() {
    const {userId} =await auth();

    if(!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    try {
        const user = await prisma.user.findUnique({where: {id: userId},
            select: {isSubscribed: true, subscriptionEnds: true}});

        if(!user) {
            return NextResponse.json({error: "User not found"}, {status: 404});
        }

        const now = new Date();

        if(user.subscriptionEnds && user.subscriptionEnds < now) {
            await prisma.user.update({
                where: { id: userId },
                data: { isSubscribed: false, subscriptionEnds: null },
              });
              return NextResponse.json({ isSubscribed: false, subscriptionEnds: null },{status: 200});
        }

        return NextResponse.json({
            isSubscribed: user.isSubscribed,
            subscriptionEnds: user.subscriptionEnds,
          },{status:200});
    } catch (error) {
        console.error("Error fetching subscription status:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
    }
}