import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/layout/section";

export default function Home() {
  return (
    <Section>
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
          <Button fullWidth>
            Order Now
          </Button>
        </Card.Footer>
      </Card>
    </Section>
  );
}