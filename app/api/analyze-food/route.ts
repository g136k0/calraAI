import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://localhost:3000',
        'X-Title': 'Caltra',
    }
});

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const response = await openai.chat.completions.create({
            model: 'stepfun/step-3.5-flash:free',
            messages: [
                {
                    role: 'system',
                    content: `You are a nutrition assistant. Return a JSON object with calorie and protein estimates per 100g for the given food. Format: {"name": "Food Name", "caloriesPer100g": <number>, "proteinPer100g": <number>}. No markdown. No explanation.`
                },
                {
                    role: 'user',
                    content: query
                },
            ],
            temperature: 0,
        });

        const content = response.choices[0]?.message?.content?.trim();
        if (!content) throw new Error('No content from AI');

        // Clean up potentially messy output (e.g. markdown code blocks)
        const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse AI response:", content);
            throw new Error("Invalid format from AI");
        }

        return NextResponse.json({ food: data });

    } catch (error: any) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json(
            { error: 'Analysis failed. Please try again.' },
            { status: 500 }
        );
    }
}
