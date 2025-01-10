import { SubTitle } from '@/auth/components/SubTitle';
import { Title } from '@/auth/components/Title';
import { useAuth } from '@/auth/hooks/useAuth';
import { billingCheckoutSessionState } from '@/auth/states/billingCheckoutSessionState';
import { SubscriptionBenefit } from '@/billing/components/SubscriptionBenefit';
import { SubscriptionPrice } from '@/billing/components/SubscriptionPrice';
import { TrialCard } from '@/billing/components/TrialCard';
import { AppPath } from '@/types/AppPath';
import { SnackBarVariant } from '@/ui/feedback/snack-bar-manager/components/SnackBar';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import styled from '@emotion/styled';
import { useState } from 'react';
import { useRecoilState } from 'recoil';
import {
    ActionLink,
    CAL_LINK,
    CardPicker,
    Loader,
    MainButton,
} from 'twenty-ui';
import { SubscriptionInterval } from '~/generated-metadata/graphql';
import {
    useCheckoutSessionMutation,
    useGetProductPricesQuery,
} from '~/generated/graphql';

const benefits = [
  'Full access',
  'Unlimited contacts',
  'Email integration',
  'Custom objects',
  'API & Webhooks',
  '1 000 workflow node executions',
];

const StyledSubscriptionContainer = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.border.radius.md};

  display: flex;
  flex-direction: column;
  margin: ${({ theme }) => theme.spacing(8)} 0
    ${({ theme }) => theme.spacing(2)};
  width: 100%;
`;

const StyledSubscriptionPriceContainer = styled.div`
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
  display: flex;
  flex-direction: column;
  margin: ${({ theme }) => theme.spacing(4)} ${({ theme }) => theme.spacing(3)}
    0 ${({ theme }) => theme.spacing(4)};
  padding-bottom: ${({ theme }) => theme.spacing(3)};
`;

const StyledBenefitsContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 16px;
  padding: ${({ theme }) => theme.spacing(4)} ${({ theme }) => theme.spacing(3)};
`;

const StyledChooseTrialContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  margin-bottom: ${({ theme }) => theme.spacing(8)};
  gap: ${({ theme }) => theme.spacing(2)};
`;

const StyledLinkGroup = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing(1)};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing(4)};

  > span {
    background-color: ${({ theme }) => theme.font.color.light};
    border-radius: 50%;
    height: 2px;
    width: 2px;
  }
`;

//TODO : work on state

const billingFreeTrialPeriods = [
  { duration: 30, withCreditCard: true },
  { duration: 7, withCreditCard: false },
];

export const ChooseYourTrial = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { enqueueSnackBar } = useSnackBar();

  const { data: prices } = useGetProductPricesQuery({
    variables: { product: 'base-plan' },
  });

  const price = prices?.getProductPrices?.productPrices.find(
    (productPrice) =>
      productPrice.recurringInterval === SubscriptionInterval.Month,
  );

  const [checkoutSession] = useCheckoutSessionMutation();

  const [billingCheckoutSession, setBillingCheckoutSession] = useRecoilState(
    billingCheckoutSessionState,
  );

  const { signOut } = useAuth();

  const handleTrialPeriodChange = (withCreditCard: boolean) => {
    return () => {
      if (
        !!price &&
        billingCheckoutSession.requirePaymentMethod !== withCreditCard
      ) {
        setBillingCheckoutSession({
          plan: billingCheckoutSession.plan,
          interval: price.recurringInterval,
          requirePaymentMethod: withCreditCard,
          skipPlanPage: false,
        });
      }
    };
  };

  const handleCheckoutSession = async () => {
    setIsSubmitting(true);
    const { data } = await checkoutSession({
      variables: {
        recurringInterval: billingCheckoutSession.interval,
        successUrlPath: AppPath.PlanRequiredSuccess,
        plan: billingCheckoutSession.plan,
        requirePaymentMethod: billingCheckoutSession.requirePaymentMethod,
      },
    });
    setIsSubmitting(false);
    if (!data?.checkoutSession.url) {
      enqueueSnackBar(
        'Checkout session error. Please retry or contact Twenty team',
        {
          variant: SnackBarVariant.Error,
        },
      );
      return;
    }
    window.location.replace(data.checkoutSession.url);
  };

  return (
    price && (
      <>
        <Title noMarginTop>Choose your Trial</Title>
        <SubTitle>Cancel anytime</SubTitle>
        <StyledSubscriptionContainer>
          <StyledSubscriptionPriceContainer>
            <SubscriptionPrice
              type={price.recurringInterval}
              price={price.unitAmount / 100}
            />
          </StyledSubscriptionPriceContainer>
          <StyledBenefitsContainer>
            {benefits.map((benefit, index) => (
              <SubscriptionBenefit key={index}>{benefit}</SubscriptionBenefit>
            ))}
          </StyledBenefitsContainer>
        </StyledSubscriptionContainer>
        <StyledChooseTrialContainer>
          {billingFreeTrialPeriods.map((trialPeriod, index) => (
            <CardPicker
              checked={
                billingCheckoutSession.requirePaymentMethod ===
                trialPeriod.withCreditCard
              }
              handleChange={handleTrialPeriodChange(trialPeriod.withCreditCard)}
              key={index}
            >
              <TrialCard
                duration={trialPeriod.duration}
                withCreditCard={trialPeriod.withCreditCard}
              />
            </CardPicker>
          ))}
        </StyledChooseTrialContainer>
        <MainButton
          title="Continue"
          onClick={handleCheckoutSession}
          width={200}
          Icon={() => isSubmitting && <Loader />}
          disabled={isSubmitting}
        />
        <StyledLinkGroup>
          <ActionLink onClick={signOut}>Log out</ActionLink>
          <span />
          <ActionLink href={CAL_LINK} target="_blank" rel="noreferrer">
            Book a Call
          </ActionLink>
        </StyledLinkGroup>
      </>
    )
  );
};
