import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const ITEMS_PER_PAGE = 10;

export async function POST(request: Request) {
    const {userId} =await auth();

    if(!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const user = await prisma.user.findUnique({where: {id: userId},include: {todos: true}})

    if(!user) {
        return NextResponse.json({error: "User not found"}, {status: 404});
    }

    if(!user.isSubscribed && user.todos.length >= 3) {
        return NextResponse.json({error: "You have reached the maximum number of todos. Please subscribe to add more."}, {status: 403});
    }

    const {title } = await request.json();

    await prisma.todo.create({
        data: {
            title,
            userId,
        }
    })

    return NextResponse.json({message: "Todo created successfully"}, {status: 201});
}

export async function GET(request: NextRequest) {
    const {userId} =await auth();

    if(!userId) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const {searchParams} = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";

    try {
        const todos = await prisma.todo.findMany({
            where: {
                userId: userId,
                title: {
                    contains: search,
                    mode: "insensitive",
                }
            },
            orderBy: {
                createdAt: "desc",
            },
            take: ITEMS_PER_PAGE,
            skip: (page - 1) * ITEMS_PER_PAGE,
        })

        const totalItems = await prisma.todo.count({
            where: {
                userId: userId,
                title: {
                    contains: search,
                    mode: "insensitive",
                }
            }
        })

        const totalPages = totalItems / ITEMS_PER_PAGE;

        return NextResponse.json({
            todos,
            currentPage: page,
            totalPages,
          },{status: 200});
    } catch (error) {
        console.error("Error fetching todos:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
    }
}