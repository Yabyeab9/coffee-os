import {
  Heading,
  Text,
  Label,
  Caption,
} from "@/components/ui/typography";

export default function Home() {
  return (
      <div className="space-y-8">

        <Heading level={1}>
          Coffee OS
        </Heading>

        <Heading level={2}>
          Specialty Coffee Platform
        </Heading>

        <Heading level={3}>
          Crafted with Care
        </Heading>

        <Text>
          Coffee OS is a reusable framework for
          specialty coffee shops and cafés.
        </Text>

        <Text variant="muted">
          Every component follows the same
          architecture.
        </Text>

        <Label htmlFor="email">
          Email Address
        </Label>

        <Caption>
          Last updated 2 minutes ago
        </Caption>

      </div>  );
}