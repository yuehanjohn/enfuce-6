import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Button,
  Hr,
  Preview,
  Section,
} from "@react-email/components";

interface SubscriptionConfirmEmailProps {
  name: string;
  planName: string;
  appUrl: string;
}

export default function SubscriptionConfirmEmail({
  name,
  planName,
  appUrl,
}: SubscriptionConfirmEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {planName} subscription is active!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Subscription Confirmed!</Heading>
          <Text style={text}>
            Hi {name}, your <strong>{planName}</strong> plan is now active. You have access to all
            the features included in your plan.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={`${appUrl}/settings/billing`}>
              Manage Subscription
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            You can manage your subscription anytime from your billing settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  maxWidth: "560px",
};
const h1 = { color: "#1a1a1a", fontSize: "24px", fontWeight: "700" as const, margin: "0 0 20px" };
const text = { color: "#4a4a4a", fontSize: "16px", lineHeight: "26px", margin: "0 0 20px" };
const btnContainer = { textAlign: "center" as const, margin: "30px 0" };
const button = {
  backgroundColor: "#000000",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};
const hr = { borderColor: "#e6ebf1", margin: "20px 0" };
const footer = { color: "#8898aa", fontSize: "12px", lineHeight: "16px" };
