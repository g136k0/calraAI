'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayData {
  date: string;
  calories: number;
  protein: number;
  entries: Array<{
    id: string;
    name: string;
    weight: number;
    calories: number;
    protein: number;
  }>;
}

interface HistorySectionProps {
  currentMonth: Date;
  historyData: Map<string, DayData>;
  calorieGoal: number;
  proteinGoal: number;
  onEditDate: (date: string) => void;
  onMonthChange: (offset: number) => void;
}

export function HistorySection({
  currentMonth,
  historyData,
  calorieGoal,
  proteinGoal,
  onEditDate,
  onMonthChange,
}: HistorySectionProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const days: (number | null)[] = Array(firstDayOfMonth).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getDateKey = (day: number) => {
    const date = new Date(year, month, day);
    // Correctly handle timezone offest to avoid off-by-one errors when converting to YYYY-MM-DD
    const offset = date.getTimezoneOffset();
    const correctDate = new Date(date.getTime() - (offset * 60 * 1000));
    return correctDate.toISOString().split('T')[0];
  };

  const selectedDayData = selectedDate
    ? historyData.get(selectedDate)
    : null;

  const calorieLabelColor = (calories: number) => {
    const percentage = (calories / calorieGoal) * 100;
    if (percentage <= 50) return 'text-gray-500';
    if (percentage <= 100) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">{monthName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mt-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-xs font-semibold text-gray-600"
              >
                {day}
              </div>
            ))}

            {days.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-16 bg-gray-50 rounded-lg"
                  />
                );
              }

              const dateKey = getDateKey(day);
              const dayData = historyData.get(dateKey);
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDate(isSelected ? null : dateKey)
                  }
                  className={`h-16 rounded-lg p-2 text-xs transition-colors ${isSelected
                    ? 'bg-green-100 border border-green-600'
                    : dayData
                      ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                      : 'bg-gray-50 border border-gray-200 text-gray-400'
                    }`}
                >
                  <div className="font-bold text-gray-900">{day}</div>
                  {dayData && (
                    <div className="text-xs mt-1">
                      <div className={calorieLabelColor(dayData.calories)}>
                        {dayData.calories} kcal
                      </div>
                      <div className="text-gray-600">{dayData.protein}g P</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className="bg-white border-0 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditDate(selectedDate)}
            >
              Edit Log
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDayData && selectedDayData.entries.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-gray-700 font-semibold">
                          Food
                        </th>
                        <th className="text-right py-2 px-2 text-gray-700 font-semibold">
                          Weight
                        </th>
                        <th className="text-right py-2 px-2 text-gray-700 font-semibold">
                          Calories
                        </th>
                        <th className="text-right py-2 px-2 text-gray-700 font-semibold">
                          Protein
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDayData.entries.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-100">
                          <td className="py-2 px-2 text-gray-900">
                            {entry.name}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {entry.weight}g
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {entry.calories}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {entry.protein}g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        Calories: {selectedDayData.calories} / {calorieGoal}
                      </span>
                      {selectedDayData.calories > calorieGoal && (
                        <span className="text-sm font-medium text-red-600">
                          Over by {selectedDayData.calories - calorieGoal}
                        </span>
                      )}
                    </div>
                    <Progress
                      value={Math.min(
                        (selectedDayData.calories / calorieGoal) * 100,
                        100
                      )}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        Protein: {selectedDayData.protein} / {proteinGoal}g
                      </span>
                      {selectedDayData.protein > proteinGoal && (
                        <span className="text-sm font-medium text-red-600">
                          Over by {selectedDayData.protein - proteinGoal}g
                        </span>
                      )}
                    </div>
                    <Progress
                      value={Math.min(
                        (selectedDayData.protein / proteinGoal) * 100,
                        100
                      )}
                      className="h-2"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No entries logged for this day
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
