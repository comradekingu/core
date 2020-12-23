<?php

namespace App\Controller;

use App\Entity\Account;
use App\Entity\PasswordChange;
use App\Security\User;
use App\Service\ApiService;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\RouterInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class PageSiteController extends AbstractController
{
    var RouterInterface $router;
    var LoggerInterface $logger;

    public function __construct(RouterInterface $router, LoggerInterface $logger)
    {
        $this->router = $router;
        $this->logger = $logger;
    }

    /**
     * @return User|UserInterface|object|null
     */
    protected function getUser()
    {
        return parent::getUser();
    }

    /**
     * @Route("/routes",
     *     methods={"GET"}
     * )
     */
    public function getRouteTranslations(): JsonResponse
    {
        $allRoutes = $this->router->getRouteCollection()->all();
        return new JsonResponse(
            array_reduce(array_keys($allRoutes), function (array $acc, string $routeName) use ($allRoutes) {
                [$routeNameWithoutLocale, $routeLocale] = explode('.', $routeName) + [null, null];
                if (strpos($routeNameWithoutLocale, 'app_') !== 0) {
                    return $acc;
                }
                $route = $allRoutes[$routeName];
                $path = $route->getPath();
                if (!isset($acc[$routeNameWithoutLocale])) {
                    $acc[$routeNameWithoutLocale] = [
                        'fr' => $path,
                        'en' => $path,
                    ];
                }
                if (isset($routeLocale)) {
                    $acc[$routeNameWithoutLocale][$routeLocale] = $path;
                }
                $acc[$path] = $routeNameWithoutLocale;
                foreach(array_keys($route->getDefaults()) as $routeDefault) {
                    // FIXME we will have issues when routes contain multiple defaults
                    $this->logger->info($routeDefault);
                    $acc[str_replace("/{{$routeDefault}}", "", $path)] = $routeNameWithoutLocale;
                }
                return $acc;
            }, [])
        );
    }

    /**
     * @Route("/locale/{_locale}",
     *     methods={"POST"}
     * )
     */
    public function switchLocale(Request $request, string $_locale): Response
    {
        $request->getSession()->set('_locale', $_locale);
        return new Response();
    }

    protected function renderSitePage(string $page, string $title, ?string $innerTitle = null, array $vueProps = []): Response
    {
        return $this->render("bare.twig", [
            'title' => $title,
            'innerTitle' => $innerTitle,
            'commit' => $_ENV['COMMIT'],
            'vueProps' => [
                'title' => $title,
                'component' => 'Site',
                'routes' => json_encode($this->getRouteTranslations()),
                'page' => $page
            ] + $vueProps
        ]);
    }

    /**
     * @Route("/{locale}",
     *     defaults={"locale"=null},
     *     requirements={"locale"="^fr|en$"},
     *     methods={"GET"}
     * )
     */
    public function showWelcome(Request $request, TranslatorInterface $translator, ?string $locale): Response
    {
        if (!is_null($locale) && in_array($locale, ['en', 'fr'])) {
            $this->switchLocale($request, $locale);
        }
        return $this->renderSitePage(
            'Welcome',
            $translator->trans('BIENVENUE')
        );
    }

    /**
     * @Route({
     *     "en": "/bookcase/show/{username}",
     *     "fr": "/bibliotheque/afficher/{username}"
     * },
     *     defaults={"username"=null},
     *     methods={"GET"}
     * )
     */
    public function showBookcasePage(TranslatorInterface $translator, ?string $username = null): Response
    {
        if (is_null($username) && is_null($this->getUser())) {
            return $this->redirectToRoute('app_login');
        }
        return $this->renderSitePage(
            'Bookcase',
            $username ? $translator->trans('BIBLIOTHEQUE_DE').' '.$username : $translator->trans('BIBLIOTHEQUE_COURT'),
            null,
            [
                'tab' => 'ViewBookcase',
                'bookcase-username' => $username ?? $this->getUser()->getUsername(),
            ]
        );
    }

    /**
     * @Route(
     *     methods={"GET", "POST"},
     *     path="/bookcase/options"
     * )
     */
    public function showBookcaseOptionsPage(TranslatorInterface $translator): Response
    {
        return $this->renderSitePage(
            'Bookcase',
            $translator->trans('BIBLIOTHEQUE_OPTIONS_COURT'),
            null,
            [
                'tab' => 'BookcaseOptions'
            ]
        );
    }

    /**
     * @Route({
     *     "en": "/bookcase/contributors",
     *     "fr": "/bibliotheque/contributeurs"
     * },
     *     methods={"GET"}
     * )
     */
    public function showBookcaseContributorsPage(TranslatorInterface $translator): Response
    {
        return $this->renderSitePage(
            'Bookcase',
            $translator->trans('BIBLIOTHEQUE_CONTRIBUTEURS_COURT'),
            null, [
                'tab' => 'BookcaseContributors'
            ]
        );
    }

    /**
     * @Route({
     *     "en": "/expand",
     *     "fr": "/agrandir"
     * },
     *     methods={"GET"}
     * )
     */
    public function showExpandPage(TranslatorInterface $translator): Response
    {
        return $this->renderSitePage(
            'Expand',
            $translator->trans('AGRANDIR_COLLECTION'),
            $translator->trans('AGRANDIR_COLLECTION'),
        );
    }

    /**
     * @Route(
     *     methods={"GET", "POST"},
     *     path="/inducks/import"
     * )
     */
    public function showImportPage(TranslatorInterface $translator): Response
    {
        return $this->renderSitePage(
            'InducksImport',
            $translator->trans('IMPORTER_INDUCKS'),
            $translator->trans('IMPORTER_INDUCKS'),
        );
    }

    /**
     * @Route({
     *     "en": "/print",
     *     "fr": "/impression"
     * },
     *     methods={"GET"}
     * )
     */
    public function showPrintPresentationPage(TranslatorInterface $translator): Response
    {
        return $this->renderSitePage(
            'PrintPresentation',
            $translator->trans('IMPRESSION_COLLECTION'),
        );
    }

    /**
     * @Route({
     *     "en": "/signup",
     *     "fr": "/inscription"
     * },
     *     methods={"GET", "PUT"}
     * )
     */
    public function showSignupPage(TranslatorInterface $translator, ApiService $apiService, Request $request): Response
    {
        if ($request->getMethod() === 'PUT') {
            $data = (json_decode($request->getContent(), true) ?? []) + $request->query->all();
            $apiResponse = $apiService->call('/ducksmanager/user', 'ducksmanager', $data, 'PUT');
            if (!is_null($apiResponse)) {
                return new Response('OK', Response::HTTP_CREATED);
            }
            return new Response('KO', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
        return $this->renderSitePage(
            'Signup',
            $translator->trans('INSCRIPTION'),
        );
    }

    /**
     * @Route(
     *     methods={"GET", "POST"},
     *     path="/stats/{type}"
     * )
     */
    public function showStatsPage(TranslatorInterface $translator, string $type): Response
    {
        return $this->renderSitePage(
            'Stats',
            $translator->trans('STATISTIQUES_COLLECTION'),
            null,
            [
                'tab' => $type
            ]
        );
    }

    /**
     * @Route({
     *     "en": "/forgot/{token}",
     *     "fr": "/mot_de_passe_oublie/{token}"
     * },
     *     methods={"GET", "POST"},
     *     defaults={"token"=null}
     * )
     */
    public function showForgotPasswordPage(Request $request, ValidatorInterface $validator, TranslatorInterface $translator, ApiService $apiService, ?string $token): Response
    {
        $errors = [];
        $success = null;
        if (!empty($token)) {
            if ($request->getMethod() === 'POST') {
                $account = PasswordChange::createFromRequest($translator, $request, $token);

                $errorResult = $validator->validate($account);
                if (!empty($errorResult->count())) {
                    /** @var ConstraintViolation $error */
                    foreach ($errorResult as $error) {
                        $errors[$error->getPropertyPath()] = $error->getMessage();
                    }
                } else {
                    $apiResponse = $apiService->callNoParse('/ducksmanager/resetpassword', 'ducksmanager', $account->toArray(), 'POST');
                    $success = $apiResponse->getStatusCode() === 200;
                }
            }
            else {
                $apiResponse = $apiService->callNoParse("/ducksmanager/resetpassword/checktoken/$token", 'ducksmanager', [], 'POST');
                if ($apiResponse->getStatusCode() !== 200) {
                    $success = false;
                }
            }
        }
        else if (!empty($email = $request->request->get('email'))) {
            $apiResponse = $apiService->call('/ducksmanager/resetpassword/init', 'ducksmanager', compact('email'), 'POST');
            $success = !is_null($apiResponse);
        }

        return $this->renderSitePage(
            'Forgot',
            $translator->trans('MOT_DE_PASSE_OUBLIE'),
            $translator->trans('MOT_DE_PASSE_OUBLIE'),
            (is_null($success) ? [] : compact('success')) + compact('token') + ['errors' => json_encode($errors)]
        );
    }

    /**
     * @Route({
     *     "en": "/collection/show/{publicationCode}",
     *     "fr": "/collection/afficher/{publicationCode}"
     * },
     *     methods={"GET"},
     *     name="app_collection_show",
     *     requirements={"publicationCode"="^(?P<publicationcode_regex>[a-z]+/[-A-Z0-9]+)|new$"},
     *     defaults={"publicationCode"=null})
     * )
     */
    public function showCollection(TranslatorInterface $translator, LoggerInterface $logger, Request $request, ApiService $apiService, ?string $publicationCode): Response
    {
        $username = $this->getUser()->getUsername();
        if ($username === 'demo') {
            $apiService->call('/ducksmanager/resetDemo', 'admin', [], 'POST');
        }
        $logger->info($request->getLocale());
        return $this->renderSitePage(
            'Collection',
            $translator->trans('COLLECTION'),
            null, [
                'tab' => 'Manage',
                'publicationcode' => $publicationCode
            ]
        );
    }

    /**
     * @Route({
     *     "en": "/collection/account",
     *     "fr": "/collection/compte"
     * },
     *     methods={"GET", "POST"}
     * )
     */
    public function showAccountPage(Request $request, TranslatorInterface $translator, ValidatorInterface $validator, ApiService $apiService): Response
    {
        $success = null;
        $errors = [];
        if ($request->getMethod() === 'POST') {
            $account = Account::createFromRequest($translator, $request, $this->getUser());

            $errorResult = $validator->validate($account);
            if (!empty($errorResult->count())) {
                /** @var ConstraintViolation $error */
                foreach ($errorResult as $error) {
                    $errors[$error->getPropertyPath()] = $error->getMessage();
                }
            } else {
                $this->getUser()->setPassword($account->getUpToDatePassword());
                $apiResponse = $apiService->call('/ducksmanager/user/'.$this->getUser()->getUsername(), 'ducksmanager', $account->toArray(), 'POST');
                $success = !is_null($apiResponse);
            }
        }

        return $this->renderSitePage(
            'Collection',
            $translator->trans('GESTION_COMPTE_COURT'),
            null,
            (is_null($success) ? [] : compact('success')) + ['tab' => 'account', 'errors' => json_encode($errors)]
        );
    }

    /**
     * @Route({
     *     "en": "/collection/subscriptions",
     *     "fr": "/collection/abonnements"
     * },
     *     methods={"GET", "POST"}
     * )
     */
    public function showSubscriptions(Request $request, ApiService $apiService, TranslatorInterface $translator): Response
    {
        $success = null;
        $errors = [];
        if (!empty($request->getMethod() === 'POST')) {
            $apiResponse = $apiService->call('/collection/subscriptions', 'ducksmanager', [
                'startDate' => $request->request->get('startDate'),
                'endDate' => $request->request->get('endDate'),
                'publicationCode' => $request->request->get('publicationCode'),
            ], 'PUT');
            $success = !is_null($apiResponse);
        }

        return $this->renderSitePage(
            'Collection',
            $translator->trans('GESTION_ABONNEMENTS'),
            null,
            (is_null($success) ? [] : compact('success'))
            + ['tab' => 'subscriptions', 'errors' => json_encode($errors)]
        );
    }


    /**
     * @Route({
     *     "en": "/bookstores",
     *     "fr": "/bouquineries"
     * },
     *     methods={"GET", "PUT"}
     * )
     */
    public function showBookstoreListPage(Request $request, ApiService $apiService, TranslatorInterface $translator): Response
    {
        $success = null;
        if ($request->getMethod() === 'PUT') {
            $data = (json_decode($request->getContent(), true) ?? []) + $request->query->all();
            $apiResponse = $apiService->call('/ducksmanager/bookstore/suggest', 'ducksmanager', $data, 'PUT');
            $success = !is_null($apiResponse);
        }
        return $this->renderSitePage(
            'Bookstores',
            $translator->trans('LISTE_BOUQUINERIES'),
            $translator->trans('LISTE_BOUQUINERIES'),
            compact('success')
        );
    }
}
