import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Youtube.Viewer 🚀
          </CardTitle>
        </CardHeader>
        {/* <CardContent>
          <p>Card Content if needed</p>
        </CardContent> */}
      </Card>
    </main>
  );
}
