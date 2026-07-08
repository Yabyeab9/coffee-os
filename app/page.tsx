
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
   
      <Card
        elevation="md"
        interactive
        className="max-w-md"
      >
        <Card.Header>
          <h2 className="text-2xl font-bold">
            Ethiopian Yirgacheffe
          </h2>

          <p className="text-sm text-stone-500">
            Bright acidity with floral notes.
          </p>
        </Card.Header>

        <Card.Content>
          <p>
            Freshly roasted specialty coffee
            sourced directly from local
            farmers.
          </p>
        </Card.Content>

        <Card.Footer>
            Order Now
         
        </Card.Footer>
      </Card>
  );
}