import { useI18n } from "vue-i18n";

const issue_condition = {
  mauvais: "mauvais",
  moyen: "moyen",
  bon: "bon",
  indefini: "indefini",
};

type issue_condition = typeof issue_condition[keyof typeof issue_condition];

export default function () {
  const { t: $t } = useI18n();
  type Condition = {
    value: string;
    dbValue: issue_condition | null;
    color: string;
    text: string;
    label: string;
  };
  const conditions: Condition[] = [
    {
      value: "missing",
      dbValue: null,
      color: "black",
      text: $t("Non possédé"),
      label: $t("Non possédé"),
    },
    {
      value: "possessed",
      dbValue: issue_condition.indefini,
      color: "#808080",
      text: $t("Indéfini"),
      label: $t("En état indéfini"),
    },
    {
      value: "bad",
      dbValue: issue_condition.mauvais,
      color: "red",
      text: $t("Mauvais"),
      label: $t("En mauvais état"),
    },
    {
      value: "notsogood",
      dbValue: issue_condition.moyen,
      color: "orange",
      text: $t("Moyen"),
      label: $t("En moyen état"),
    },
    {
      value: "good",
      dbValue: issue_condition.bon,
      color: "#2CA77B",
      text: $t("Bon"),
      label: $t("En bon état"),
    },
  ];
  return {
    conditions,
    getConditionLabel: (givenDbValue: string) =>
      conditions.find(
        ({ dbValue }) => givenDbValue.toUpperCase() === dbValue?.toUpperCase()
      )?.label || conditions.find(({ dbValue }) => dbValue === null)!.label,
  };
}
