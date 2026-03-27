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

interface PaymentFailedEmailProps {
  name: string;
  appUrl: string;
}

export default function PaymentFailedEmail({ name, appUrl }: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Action required: Payment failed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Failed</Heading>
          <Text style={text}>
            Hi {name}, we were unable to process your latest payment. Please update your payment
            method to avoid service interruption.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={`${appUrl}/settings/billing`}>
              Update Payment Method
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            If you believe this is an error, please contact our support team.
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
  backgroundColor: "#dc2626",
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
